import axiosClient from "./axiosClient";

export const certificateApi = {
  generate: (courseId: string) =>
    axiosClient.post(`/certificates/courses/${courseId}/generate`),

  myCertificates: () =>
    axiosClient.get("/certificates/my"),

  verify: (code: string) =>
    axiosClient.get(`/certificates/${code}`),
};