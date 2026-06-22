import { useEffect, useState } from "react";
import { couponApi } from "../../api/couponApi";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: 10,
    maxUses: "",
    expiredAt: "",
  });

  const fetchCoupons = async () => {
    const res = await couponApi.getAll();
    setCoupons(res.data);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    await couponApi.create({
      code: form.code,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      expiredAt: form.expiredAt ? new Date(form.expiredAt).toISOString() : undefined,
      isActive: true,
    });

    alert("Tạo coupon thành công");

    setForm({
      code: "",
      discountType: "PERCENT",
      discountValue: 10,
      maxUses: "",
      expiredAt: "",
    });

    fetchCoupons();
  };

  return (
    <div>
      <h2>Quản lý mã giảm giá</h2>

      <form onSubmit={handleCreate}>
        <input
          placeholder="Mã coupon"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />

        <select
          value={form.discountType}
          onChange={(e) => setForm({ ...form, discountType: e.target.value })}
        >
          <option value="PERCENT">Giảm theo %</option>
          <option value="FIXED">Giảm tiền cố định</option>
        </select>

        <input
          type="number"
          placeholder="Giá trị giảm"
          value={form.discountValue}
          onChange={(e) =>
            setForm({ ...form, discountValue: Number(e.target.value) })
          }
        />

        <input
          type="number"
          placeholder="Số lượt tối đa"
          value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
        />

        <input
          type="datetime-local"
          value={form.expiredAt}
          onChange={(e) => setForm({ ...form, expiredAt: e.target.value })}
        />

        <button type="submit">Tạo coupon</button>
      </form>

      <hr />

      <h3>Danh sách coupon</h3>

      {coupons.map((item) => (
        <div key={item.id} style={{ border: "1px solid #ddd", padding: 12 }}>
          <p>Mã: {item.code}</p>
          <p>Loại: {item.discountType}</p>
          <p>Giá trị: {item.discountValue}</p>
          <p>
            Đã dùng: {item.usedCount}/{item.maxUses || "Không giới hạn"}
          </p>
          <p>Trạng thái: {item.isActive ? "Đang bật" : "Đã tắt"}</p>
        </div>
      ))}
    </div>
  );
}