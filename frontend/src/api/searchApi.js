import axiosClient from "../auth/axiosClient";

export const searchServices = async (params) => {
  const response = await axiosClient.get("/search", { params });
  return response.data;
};
