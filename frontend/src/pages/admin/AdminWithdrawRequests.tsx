import { useEffect, useState } from "react";
import { walletApi } from "../../api/walletApi";

export default function AdminWithdrawRequests() {
  const [items, setItems] = useState<any[]>([]);

  const fetchData = async () => {
    const res = await walletApi.getAllWithdraws();
    setItems(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <h2>Yêu cầu rút tiền</h2>

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <p>Teacher: {item.teacher.fullName}</p>
          <p>Email: {item.teacher.email}</p>
          <p>Số tiền: {item.amount.toLocaleString()} đ</p>
          <p>Trạng thái: {item.status}</p>
          <p>Ghi chú: {item.note}</p>

          <button onClick={() => walletApi.approveWithdraw(item.id).then(fetchData)}>
            Duyệt
          </button>

          <button onClick={() => walletApi.rejectWithdraw(item.id).then(fetchData)}>
            Từ chối
          </button>

          <button onClick={() => walletApi.markPaidWithdraw(item.id).then(fetchData)}>
            Đã chuyển tiền
          </button>
        </div>
      ))}
    </div>
  );
}