import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId");

  return (
    <div>
      <h2>Thanh toán thất bại</h2>

      <p>Đơn hàng: {orderId}</p>

      <button onClick={() => navigate("/")}>
        Quay lại danh sách khóa học
      </button>
    </div>
  );
}