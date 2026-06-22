import { useEffect, useState } from "react";
import { adminDashboardApi } from "../../api/adminDashboardApi";

export default function AdminRevenue() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    adminDashboardApi.getRevenue().then((res) => {
      setData(res.data);
    });
  }, []);

  if (!data) return <div>Đang tải doanh thu hệ thống...</div>;

  return (
    <div>
      <h2>Doanh thu hệ thống</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Tổng doanh thu</h3>
          <p>{data.totalRevenue.toLocaleString()} đ</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Phí nền tảng 20%</h3>
          <p>{data.platformFee.toLocaleString()} đ</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Doanh thu giáo viên 80%</h3>
          <p>{data.teacherRevenue.toLocaleString()} đ</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Số đơn hàng</h3>
          <p>{data.totalOrders}</p>
        </div>
      </div>

      <h3>Doanh thu theo giáo viên</h3>

      {data.teacherRevenueSummary.map((item: any) => (
        <div
          key={item.teacherId}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 8,
          }}
        >
          <b>{item.teacherName}</b>
          <p>{item.teacherEmail}</p>
          <p>Tổng bán: {item.totalRevenue.toLocaleString()} đ</p>
          <p>Phí nền tảng: {item.platformFee.toLocaleString()} đ</p>
          <p>Teacher nhận: {item.teacherRevenue.toLocaleString()} đ</p>
          <p>Số đơn: {item.orders}</p>
        </div>
      ))}

      <h3>Danh sách đơn hàng PAID</h3>

      {data.orders.map((order: any) => (
        <div
          key={order.id}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 8,
          }}
        >
          <p>
            <b>Khóa học:</b> {order.course.title}
          </p>
          <p>
            <b>Teacher:</b> {order.course.teacher.fullName}
          </p>
          <p>
            <b>Student:</b> {order.user.fullName} - {order.user.email}
          </p>
          <p>
            <b>Số tiền:</b> {order.amount.toLocaleString()} đ
          </p>
          <p>
            <b>Ngày mua:</b>{" "}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}