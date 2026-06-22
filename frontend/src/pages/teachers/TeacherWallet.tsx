import { useEffect, useState } from "react";
import { walletApi } from "../../api/walletApi";

export default function TeacherWallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [withdraws, setWithdraws] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const fetchData = async () => {
    const walletRes = await walletApi.getTeacherWallet();
    setWallet(walletRes.data);

    const withdrawRes = await walletApi.getMyWithdraws();
    setWithdraws(withdrawRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWithdraw = async () => {
    await walletApi.createWithdraw({
      amount: Number(amount),
      note,
    });

    alert("Gửi yêu cầu rút tiền thành công");
    setAmount("");
    setNote("");
    fetchData();
  };

  if (!wallet) return <div>Đang tải ví...</div>;

  return (
    <div>
      <h2>Ví giáo viên</h2>

      <p>Tổng doanh thu: {wallet.grossRevenue.toLocaleString()} đ</p>
      <p>Phí nền tảng: {wallet.platformFee.toLocaleString()} đ</p>
      <p>Teacher nhận: {wallet.teacherRevenue.toLocaleString()} đ</p>
      <p>Đang chờ rút: {wallet.pendingWithdraw.toLocaleString()} đ</p>
      <p>Đã thanh toán: {wallet.paidWithdraw.toLocaleString()} đ</p>
      <h3>Số dư khả dụng: {wallet.availableBalance.toLocaleString()} đ</h3>

      <hr />

      <h3>Yêu cầu rút tiền</h3>

      <input
        type="number"
        placeholder="Số tiền"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <textarea
        placeholder="Ghi chú / thông tin tài khoản nhận tiền"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button onClick={handleWithdraw}>Gửi yêu cầu rút tiền</button>

      <hr />

      <h3>Lịch sử rút tiền</h3>

      {withdraws.map((item) => (
        <div key={item.id}>
          <p>Số tiền: {item.amount.toLocaleString()} đ</p>
          <p>Trạng thái: {item.status}</p>
          <p>Ghi chú: {item.note}</p>
        </div>
      ))}
    </div>
  );
}