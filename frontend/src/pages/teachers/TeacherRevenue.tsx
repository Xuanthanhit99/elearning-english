import { useEffect, useState } from "react";
import { teacherDashboardApi } from "../../api/teacherDashboardApi";

export default function TeacherRevenue() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    teacherDashboardApi.getRevenue().then((res) => {
      setData(res.data);
    });
  }, []);

  if (!data) return <div>Đang tải doanh thu...</div>;

  return (
    <div>
      <h2>Doanh thu của tôi</h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Tổng doanh thu</h3>
          <p>{data.totalRevenue.toLocaleString()} đ</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Số đơn hàng</h3>
          <p>{data.totalOrders}</p>
        </div>

        <div style={{ border: "1px solid #ddd", padding: 16 }}>
          <h3>Số học viên</h3>
          <p>{data.totalStudents}</p>
        </div>
      </div>

      <h3>Doanh thu theo khóa học</h3>

      {data.courseRevenue.map((item: any) => (
        <div
          key={item.courseId}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginBottom: 8,
          }}
        >
          <b>{item.title}</b>
          <p>Doanh thu: {item.revenue.toLocaleString()} đ</p>
          <p>Số đơn: {item.orders}</p>
        </div>
      ))}

      <h3>Đơn hàng đã thanh toán</h3>

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
            <b>Học viên:</b> {order.user.fullName} - {order.user.email}
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