import { useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function Register() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'TEACHER',
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    await axiosClient.post('/auth/register', form);

    alert('Đăng ký thành công, vui lòng đăng nhập');
  };

  return (
    <form onSubmit={handleRegister}>
      <h2>Đăng ký Teacher</h2>

      <input
        placeholder="Họ tên"
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
      />

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        placeholder="Mật khẩu"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button type="submit">Đăng ký</button>
    </form>
  );
}