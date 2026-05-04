import axiosClient from "../auth/axiosClient";
import { API_BASE_URL } from "../config/runtime";

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
