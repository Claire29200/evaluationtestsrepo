import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5005/api/cds";

export const getCDs = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const addCD = async (cd) => {
  const response = await axios.post(API_URL, cd);
  return response.data;
};

export const deleteCD = async (id) => {
  await axios.delete(`${API_URL}/${id}`);
};
