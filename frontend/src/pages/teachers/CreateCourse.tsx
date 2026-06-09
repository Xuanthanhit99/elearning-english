import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseApi } from "../../api/courseApi";

const CreateCourse = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "Beginner",
    price: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await courseApi.createCourse({
      ...form,
      price: Number(form.price),
    });

    navigate(`/teacher/courses/${res.data.id}`);
  };
  return (
    <form onSubmit={handleSubmit}>
      <h2>Tạo khóa học</h2>

      <input
        placeholder="Tên khóa học"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        placeholder="Mô tả khóa học"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <select
        value={form.level}
        onChange={(e) => setForm({ ...form, level: e.target.value })}
      >
        <option value="Beginner">Beginner</option>
        <option value="Intermediate">Intermediate</option>
        <option value="Advanced">Advanced</option>
      </select>

      <input
        type="number"
        placeholder="Giá"
        value={form.price}
        onChange={(e) =>
          setForm({
            ...form,
            price: Number(e.target.value),
          })
        }
      />

      <button type="submit">Tạo khóa học</button>
    </form>
  );
};

export default CreateCourse;
