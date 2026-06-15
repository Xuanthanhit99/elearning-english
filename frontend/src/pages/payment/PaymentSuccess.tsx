import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId");

  return (
    <div>
      <h2>Thanh toán thành công</h2>

      <p>Đơn hàng: {orderId}</p>

      <p>Bạn đã được kích hoạt khóa học.</p>

      <button onClick={() => navigate("/my-learning")}>
        Vào khóa học của tôi
      </button>
    </div>
  );
}