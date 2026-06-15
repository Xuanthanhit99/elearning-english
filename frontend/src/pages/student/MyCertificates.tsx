import { useEffect, useState } from "react";
import { certificateApi } from "../../api/certificateApi";

export default function MyCertificates() {
  const [certificates, setCertificates] =
    useState<any[]>([]);

  useEffect(() => {
    certificateApi
      .myCertificates()
      .then((res) => {
        setCertificates(res.data);
      });
  }, []);

  return (
    <div>
      <h2>Chứng chỉ của tôi</h2>

      {certificates.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ddd",
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3>{item.course.title}</h3>

          <p>
            Certificate:
            {item.code}
          </p>

          <p>
            Ngày cấp:
            {new Date(
              item.createdAt
            ).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}