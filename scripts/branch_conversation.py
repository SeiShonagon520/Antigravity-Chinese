import os
import sys
import json
import uuid
import shutil
import sqlite3
import pathlib
from datetime import datetime, timezone

def get_gemini_dir():
    return pathlib.Path.home() / ".gemini" / "antigravity"

def get_app_storage_path():
    return pathlib.Path.home() / "AppData" / "Roaming" / "Antigravity" / "app_storage.json"

def get_latest_conversation_id():
    db_path = get_gemini_dir() / "conversation_summaries.db"
    if not db_path.exists():
        return None
    conn = sqlite3.connect(db_path)
    row = conn.execute("SELECT conversation_id FROM conversation_summaries ORDER BY last_modified_time DESC LIMIT 1").fetchone()
    conn.close()
    return row[0] if row else None

def branch_conversation(source_id=None, branch_title=None, up_to_step=None):
    gemini_dir = get_gemini_dir()
    sum_db_path = gemini_dir / "conversation_summaries.db"
    
    if not sum_db_path.exists():
        raise FileNotFoundError(f"conversation_summaries.db not found at {sum_db_path}")

    # 1. 自动定位源会话
    if not source_id:
        source_id = get_latest_conversation_id()
    if not source_id:
        raise ValueError("未能找到当前活跃的会话 ID")

    # 2. 读取源会话元数据
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

    # 3. 复制 conversations/<source_id>.db 数据库 (使用官方 backup API 确保 WAL 模式安全原子复制)
    src_db = gemini_dir / "conversations" / f"{source_id}.db"
    dst_db = gemini_dir / "conversations" / f"{new_id}.db"
    if src_db.exists():
        conn_src = sqlite3.connect(src_db)
        conn_dst = sqlite3.connect(dst_db)
        conn_src.backup(conn_dst)
        conn_src.close()
        
        # 更新新库的内部 cascade_id 与修剪 steps
        try:
            conn_dst.execute("UPDATE trajectory_meta SET cascade_id = ?", (new_id,))
        except Exception:
            pass

        actual_steps = None
        if up_to_step is not None:
            try:
                conn_dst.execute("DELETE FROM steps WHERE idx > ?", (up_to_step,))
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

    # 4. 复制 brain/<source_id> 目录
    src_brain = gemini_dir / "brain" / source_id
    dst_brain = gemini_dir / "brain" / new_id
    if src_brain.exists():
        shutil.copytree(src_brain, dst_brain, dirs_exist_ok=True)
        # 如果指定了修剪步数，修剪 transcript.jsonl
        if up_to_step is not None:
            for log_name in ["transcript.jsonl", "transcript_full.jsonl"]:
                log_path = dst_brain / ".system_generated" / "logs" / log_name
                if log_path.exists():
                    lines = []
                    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            try:
                                item = json.loads(line)
                                if item.get("step_index", 0) <= up_to_step:
                                    lines.append(line)
                            except Exception:
                                lines.append(line)
                    with open(log_path, "w", encoding="utf-8") as f:
                        f.writelines(lines)

    # 5. 插入 conversation_summaries.db 新行
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.0000000+00:00")
    row_dict["conversation_id"] = new_id
    row_dict["title"] = branch_title
    row_dict["parent_conversation_id"] = source_id
    row_dict["last_modified_time"] = now_str
    row_dict["last_user_input_time"] = now_str
    if actual_steps is not None:
        row_dict["step_count"] = actual_steps

    if row_dict.get("raw_summary"):
        try:
            row_dict["raw_summary"] = bytes(row_dict["raw_summary"]).replace(source_id.encode(), new_id.encode())
        except Exception:
            pass

    cols = ", ".join(f"`{k}`" for k in row_dict.keys())
    placeholders = ", ".join("?" for _ in row_dict)
    conn_sum.execute(f"INSERT OR REPLACE INTO conversation_summaries ({cols}) VALUES ({placeholders})", list(row_dict.values()))
    conn_sum.commit()
    conn_sum.close()

    # 6. 更新 app_storage.json 置顶与布局
    storage_path = get_app_storage_path()
    if storage_path.exists():
        try:
            with open(storage_path, "r", encoding="utf-8") as f:
                storage_data = json.load(f)
            
            # 添加布局
            storage_data[f"antigravity-multi-conversation-layout-v3-{new_id}"] = json.dumps({
                "rootNode": {"type": "pane", "id": "pane-1", "cascadeId": new_id},
                "focusedPaneId": "pane-1"
            })

            # 插入到置顶会话列表头部
            try:
                pinned = json.loads(storage_data.get("pinned_conversations_order", "[]"))
                if new_id not in pinned:
                    pinned.insert(0, new_id)
                storage_data["pinned_conversations_order"] = json.dumps(pinned)
            except Exception:
                pass

            with open(storage_path, "w", encoding="utf-8") as f:
                json.dump(storage_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: update app_storage failed: {e}", file=sys.stderr)

    return {
        "success": True,
        "branchId": new_id,
        "sourceId": source_id,
        "title": branch_title,
        "stepCount": actual_steps
    }

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else None
    title = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else None
    step = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else None
    try:
        res = branch_conversation(src, title, step)
        print(json.dumps(res, ensure_ascii=False, indent=2))
    except Exception as err:
        print(json.dumps({"success": False, "error": str(err)}, ensure_ascii=False))
        sys.exit(1)
