import axiosClient from "../auth/axiosClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const getShopReviews = async (shopId) => {
  try {
    const response = await axiosClient.get(`${API_BASE_URL}/shops/${shopId}/reviews`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createReview = async (reviewData) => {
  try {
    const response = await axiosClient.post(`${API_BASE_URL}/reviews`, reviewData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};