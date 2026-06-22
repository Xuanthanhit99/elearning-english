import { useEffect, useState } from "react";
import { notificationApi } from "../api/notificationApi";

export default function NotificationBell() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const res = await notificationApi.getMyNotifications();
    setItems(res.data);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}>
        🔔 {unreadCount > 0 && `(${unreadCount})`}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 40,
            width: 320,
            background: "#fff",
            border: "1px solid #ddd",
            padding: 12,
            zIndex: 10,
          }}
        >
          <button
            onClick={async () => {
              await notificationApi.markAllAsRead();
              fetchNotifications();
            }}
          >
            Đánh dấu tất cả đã đọc
          </button>

          {items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 8,
                background: item.isRead ? "#fff" : "#f0f7ff",
                borderBottom: "1px solid #eee",
              }}
              onClick={async () => {
                await notificationApi.markAsRead(item.id);
                fetchNotifications();
              }}
            >
              <b>{item.title}</b>
              <p>{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}