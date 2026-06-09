import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { setAccessToken, setCurrentUser } from "../api/tokenStore";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await axiosClient.post("/auth/login", form);

      setAccessToken(res.data.accessToken);
      setCurrentUser(res.data.user);

      if (res.data.user.role === "ADMIN") {
        navigate("/admin/pending-courses");
      } else if (res.data.user.role === "TEACHER") {
        navigate("/teacher/courses");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Response error:", error.response?.data);

      alert(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  console.log("first")

  return (
    <form onSubmit={handleLogin}>
      <h2>Đăng nhập</h2>

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) =>
          setForm({
            ...form,
            email: e.target.value,
          })
        }
      />

      <input
        placeholder="Mật khẩu"
        type="password"
        value={form.password}
        onChange={(e) =>
          setForm({
            ...form,
            password: e.target.value,
          })
        }
      />

      <button type="submit">Đăng nhập</button>
    </form>
  );
}
