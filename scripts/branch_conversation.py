import os
import sys
import io
import json
import uuid
import shutil
import sqlite3
import pathlib
from datetime import datetime, timezone

# 强制标准流为 UTF-8 编码，防止 Windows CP936 中文与 Emoji 乱码或编码异常
if sys.platform == "win32":
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stdin, 'buffer'):
        sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='replace')

def get_gemini_dir():
    return pathlib.Path.home() / ".gemini" / "antigravity"

def get_app_storage_path():
    return pathlib.Path.home() / "AppData" / "Roaming" / "Antigravity" / "app_storage.json"

def get_latest_conversation_id():
    db_path = get_gemini_dir() / "conversation_summaries.db"
    if not db_path.exists():
        return None
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT conversation_id FROM conversation_summaries WHERE parent_conversation_id = '' ORDER BY last_modified_time DESC LIMIT 1").fetchone()
    conn.close()
    return row[0] if row else None

def find_prune_step(source_id, turn_index=None, snippet=None):
    gemini_dir = get_gemini_dir()
    log_path = gemini_dir / "brain" / source_id / ".system_generated" / "logs" / "transcript.jsonl"
    if not log_path.exists():
        return None, None

    turns = []
    current_turn = None
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line_str = line.strip()
            if not line_str:
                continue
            try:
                item = json.loads(line_str)
                step_idx = item.get("step_index", 0)
                t = item.get("type")
                content = item.get("content") or ""

                if t == "USER_INPUT":
                    if current_turn:
                        turns.append(current_turn)
                    clean_content = content.replace("<USER_REQUEST>", "").replace("</USER_REQUEST>", "")
                    if "<ADDITIONAL_METADATA>" in clean_content:
                        clean_content = clean_content.split("<ADDITIONAL_METADATA>")[0]
                    clean_content = clean_content.strip()

                    current_turn = {
                        "user_step": step_idx,
                        "last_step": step_idx,
                        "user_content": clean_content,
                        "assistant_content": ""
                    }
                elif current_turn:
                    current_turn["last_step"] = max(current_turn["last_step"], step_idx)
                    if t == "PLANNER_RESPONSE" and content:
                        current_turn["assistant_content"] += "\n" + content
            except Exception:
                pass

    if current_turn:
        turns.append(current_turn)

    if not turns:
        return None, None

    # 1. 优先按消息内容片段精确匹配
    if snippet and len(snippet.strip()) >= 4:
        clean = " ".join(snippet.strip().split())[:50]
        for idx, t in enumerate(turns):
            u_clean = " ".join(t["user_content"].split())
            a_clean = " ".join(t["assistant_content"].split())
            if clean in u_clean or clean in a_clean:
                return t["last_step"], idx
            short = clean[:20]
            if len(short) >= 4 and (short in u_clean or short in a_clean):
                return t["last_step"], idx

    # 2. 其次按轮次索引匹配
    if turn_index is not None and 0 <= turn_index < len(turns):
        return turns[turn_index]["last_step"], turn_index

    return None, None

def branch_conversation(source_id=None, branch_title=None, up_to_step=None, turn_index=None, snippet=None, **kwargs):
    if not branch_title and "title" in kwargs:
        branch_title = kwargs["title"]

    gemini_dir = get_gemini_dir()
    sum_db_path = gemini_dir / "conversation_summaries.db"
    
    if not sum_db_path.exists():
        raise FileNotFoundError(f"conversation_summaries.db not found at {sum_db_path}")

    # 1. 自动定位源会话
    if not source_id:
        source_id = get_latest_conversation_id()
    if not source_id:
        raise ValueError("未能找到当前活跃的会话 ID")

    # 2. 如果未指定具体步数，但指定了轮次或消息文本片段，自动定位截断步数与轮次
    cutoff_turn_index = turn_index
    if up_to_step is None and (turn_index is not None or snippet is not None):
        up_to_step, matched_turn = find_prune_step(source_id, turn_index, snippet)
        if cutoff_turn_index is None:
            cutoff_turn_index = matched_turn
    elif cutoff_turn_index is None and up_to_step is not None:
        _, matched_turn = find_prune_step(source_id, snippet=snippet)
        if matched_turn is not None:
            cutoff_turn_index = matched_turn

    # 3. 读取源会话元数据
    conn_sum = sqlite3.connect(sum_db_path)
    conn_sum.row_factory = sqlite3.Row
    source_row = conn_sum.execute("SELECT * FROM conversation_summaries WHERE conversation_id = ?", (source_id,)).fetchone()
    if not source_row:
        conn_sum.close()
        raise ValueError(f"在 conversation_summaries 中未找到源会话 {source_id}")
    
    row_dict = dict(source_row)
    source_title = row_dict.get("title") or "未命名对话"
    if not branch_title:
        branch_title = f"{source_title} (分支)"

    new_id = str(uuid.uuid4())
    new_trajectory_id = str(uuid.uuid4())

    # 4. 复制 conversations/<source_id>.db 数据库 (使用官方 backup API 确保 WAL 模式安全原子复制)
    src_db = gemini_dir / "conversations" / f"{source_id}.db"
    dst_db = gemini_dir / "conversations" / f"{new_id}.db"
    source_trajectory_id = None
    if src_db.exists():
        conn_src = sqlite3.connect(src_db)
        conn_dst = sqlite3.connect(dst_db)
        conn_src.backup(conn_dst)
        conn_src.close()
        
        # 读取旧 trajectory_id 并更新新库的内部 cascade_id 与 trajectory_id
        try:
            row_meta = conn_dst.execute("SELECT trajectory_id FROM trajectory_meta LIMIT 1").fetchone()
            if row_meta:
                source_trajectory_id = row_meta[0]
            conn_dst.execute("UPDATE trajectory_meta SET cascade_id = ?, trajectory_id = ?", (new_id, new_trajectory_id))
        except Exception:
            pass

        # 同步更新 trajectory_metadata_blob 内部二进制数据 (修复 ID 遗留不同步问题)
        try:
            blob_rows = conn_dst.execute("SELECT id, data FROM trajectory_metadata_blob").fetchall()
            for b_id, b_data in blob_rows:
                if b_data:
                    new_b_data = bytes(b_data)
                    import re as _re
                    uuids = _re.findall(rb'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', new_b_data)
                    if len(uuids) >= 2:
                        new_b_data = new_b_data.replace(uuids[0], new_trajectory_id.encode())
                        new_b_data = new_b_data.replace(uuids[1], new_id.encode())
                    else:
                        new_b_data = new_b_data.replace(source_id.encode(), new_id.encode())
                        if source_trajectory_id:
                            new_b_data = new_b_data.replace(source_trajectory_id.encode(), new_trajectory_id.encode())
                    conn_dst.execute("UPDATE trajectory_metadata_blob SET data = ? WHERE id = ?", (new_b_data, b_id))
        except Exception:
            pass

        # 同步更新 steps 表中的 step_payload (将旧会话 ID 替换为新会话 ID，避免跨会话遥测引用)
        try:
            step_rows = conn_dst.execute("SELECT idx, step_payload FROM steps WHERE step_payload IS NOT NULL").fetchall()
            for s_idx, s_payload in step_rows:
                if s_payload and source_id.encode() in s_payload:
                    new_payload = bytes(s_payload).replace(source_id.encode(), new_id.encode())
                    conn_dst.execute("UPDATE steps SET step_payload = ? WHERE idx = ?", (new_payload, s_idx))
        except Exception:
            pass

        actual_steps = None
        if up_to_step is not None:
            for tbl in ["steps", "gen_metadata", "executor_metadata", "parent_references", "battle_mode_infos"]:
                try:
                    conn_dst.execute(f"DELETE FROM {tbl} WHERE idx > ?", (up_to_step,))
                except Exception:
                    pass
            try:
                actual_steps = conn_dst.execute("SELECT count(*) FROM steps").fetchone()[0]
            except Exception:
                pass
        else:
            try:
                actual_steps = conn_dst.execute("SELECT count(*) FROM steps").fetchone()[0]
            except Exception:
                pass

        conn_dst.commit()
        conn_dst.close()
    else:
        actual_steps = row_dict.get("step_count", 0)

    # 5. 复制 brain/<source_id> 目录
    src_brain = gemini_dir / "brain" / source_id
    dst_brain = gemini_dir / "brain" / new_id
    if src_brain.exists():
        shutil.copytree(src_brain, dst_brain, dirs_exist_ok=True)
        
        # 核心关键修复 1: 彻底删除新会话中的 chunks 缓存！
        # Antigravity 优先从 chunks/ 目录加载分块消息，若不删除会导致旧的后续消息被再次显示！
        chunks_dir = dst_brain / ".system_generated" / "logs" / "chunks"
        if chunks_dir.exists():
            shutil.rmtree(chunks_dir, ignore_errors=True)

        # 如果指定了修剪步数，严格修剪 transcript.jsonl 与 transcript_full.jsonl
        if up_to_step is not None:
            for log_name in ["transcript.jsonl", "transcript_full.jsonl"]:
                log_path = dst_brain / ".system_generated" / "logs" / log_name
                if log_path.exists():
                    lines = []
                    seen_user_turns = 0
                    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            try:
                                item = json.loads(line)
                                t = item.get("type")
                                step_idx = item.get("step_index", 0)

                                if t == "USER_INPUT":
                                    if cutoff_turn_index is not None and seen_user_turns > cutoff_turn_index:
                                        # 遇到下一个轮次的用户提问，彻底截断，停止后续读取！
                                        break
                                    seen_user_turns += 1

                                if cutoff_turn_index is not None and seen_user_turns > (cutoff_turn_index + 1):
                                    break

                                if step_idx <= up_to_step:
                                    lines.append(line.replace(source_id, new_id))
                            except Exception:
                                lines.append(line.replace(source_id, new_id))
                    with open(log_path, "w", encoding="utf-8") as f:
                        f.writelines(lines)

            # 核心关键修复 2: 清理 .system_generated/steps 目录下超过 up_to_step 的 step 文件夹
            steps_dir = dst_brain / ".system_generated" / "steps"
            if steps_dir.exists():
                for step_item in steps_dir.iterdir():
                    try:
                        if int(step_item.name) > up_to_step:
                            if step_item.is_dir():
                                shutil.rmtree(step_item, ignore_errors=True)
                            else:
                                step_item.unlink(missing_ok=True)
                    except ValueError:
                        pass
        else:
            # 全量克隆时，将日志中的旧 source_id 替换为新分支 new_id
            for log_name in ["transcript.jsonl", "transcript_full.jsonl"]:
                log_path = dst_brain / ".system_generated" / "logs" / log_name
                if log_path.exists():
                    try:
                        content = log_path.read_text(encoding="utf-8", errors="ignore")
                        log_path.write_text(content.replace(source_id, new_id), encoding="utf-8")
                    except Exception:
                        pass

    # 6. 插入 conversation_summaries.db 新行
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.0000000+00:00")
    row_dict["conversation_id"] = new_id
    row_dict["title"] = branch_title
    row_dict["preview"] = branch_title
    # 【核心关键修复】：parent_conversation_id 必须为空字符串！
    # Antigravity 后端会话列表过滤规则严格要求 parent_conversation_id = ''，非空则被归类为内部 Subagent 并从侧边栏彻底隐藏！
    row_dict["parent_conversation_id"] = ""
    row_dict["status"] = "CASCADE_RUN_STATUS_IDLE"
    row_dict["not_fully_idle"] = 0
    row_dict["killed"] = 0
    row_dict["last_modified_time"] = now_str
    row_dict["last_user_input_time"] = now_str
    if actual_steps is not None:
        row_dict["step_count"] = actual_steps

    if row_dict.get("raw_summary"):
        try:
            raw_b = bytes(row_dict["raw_summary"])
            raw_b = raw_b.replace(source_id.encode(), new_id.encode())
            if source_trajectory_id:
                raw_b = raw_b.replace(source_trajectory_id.encode(), new_trajectory_id.encode())
            row_dict["raw_summary"] = raw_b
        except Exception:
            pass

    cols = ", ".join(f"`{k}`" for k in row_dict.keys())
    placeholders = ", ".join("?" for _ in row_dict)
    conn_sum.execute(f"INSERT OR REPLACE INTO conversation_summaries ({cols}) VALUES ({placeholders})", list(row_dict.values()))
    conn_sum.commit()
    conn_sum.close()

    # 7. 更新 app_storage.json 布局配置
    storage_path = get_app_storage_path()
    if storage_path.exists():
        try:
            with open(storage_path, "r", encoding="utf-8") as f:
                storage_data = json.load(f)
            
            # 添加布局 (确保多会话窗格系统正确渲染新分支)
            storage_data[f"antigravity-multi-conversation-layout-v3-{new_id}"] = json.dumps({
                "rootNode": {"type": "pane", "id": "pane-1", "cascadeId": new_id},
                "focusedPaneId": "pane-1"
            })

            with open(storage_path, "w", encoding="utf-8") as f:
                json.dump(storage_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: update app_storage failed: {e}", file=sys.stderr)

    return {
        "success": True,
        "branchId": new_id,
        "sourceId": source_id,
        "title": branch_title,
        "stepCount": actual_steps,
        "prunedToStep": up_to_step
    }

if __name__ == "__main__":
    src = None
    title = None
    step = None
    t_idx = None
    snip = None

    # 优先从 stdin 读取 JSON 数据 (彻底解决 Windows 命令行 ANSI/CP936 传参中文乱码问题)
    if not sys.stdin.isatty():
        try:
            stdin_data = sys.stdin.read().strip()
            if stdin_data:
                params = json.loads(stdin_data)
                src = params.get("sourceId") or None
                title = params.get("title") or None
                step = params.get("upToStep")
                if step is not None:
                    step = int(step)
                t_idx = params.get("turnIndex")
                if t_idx is not None:
                    t_idx = int(t_idx)
                snip = params.get("snippet") or None
        except Exception:
            pass

    # 兜底支持 argv 传入
    if not src and len(sys.argv) > 1 and sys.argv[1]:
        src = sys.argv[1]
    if not title and len(sys.argv) > 2 and sys.argv[2]:
        title = sys.argv[2]
    if step is None and len(sys.argv) > 3 and sys.argv[3].isdigit():
        step = int(sys.argv[3])
    if t_idx is None and len(sys.argv) > 4 and sys.argv[4].isdigit():
        t_idx = int(sys.argv[4])
    if not snip and len(sys.argv) > 5 and sys.argv[5]:
        snip = sys.argv[5]

    try:
        res = branch_conversation(src, title, step, t_idx, snip)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    except Exception as err:
        print(json.dumps({"success": False, "error": str(err)}, ensure_ascii=False))
        sys.exit(1)
