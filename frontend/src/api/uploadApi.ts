import axiosClient from "./axiosClient";

export const uploadApi = {
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return await axiosClient.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

    uploadVideo: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return await axiosClient.post("/upload/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
