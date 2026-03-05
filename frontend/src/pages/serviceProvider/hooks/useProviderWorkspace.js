import { useOutletContext } from "react-router-dom";

export const useProviderWorkspace = () => {
  const context = useOutletContext();

  if (!context) {
    throw new Error("Provider workspace context is unavailable");
  }

  return context;
};
