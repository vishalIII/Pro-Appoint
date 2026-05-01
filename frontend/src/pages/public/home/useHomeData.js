import { useEffect, useState } from "react";
import {
  API_BASE_URL,
  FALLBACK_DEPARTMENTS,
  FEATURED_SERVICE_LIMIT,
  SERVICE_CARD_TONES
} from "./constants";
import { formatServicePrice, getInitials, parseJsonSafely } from "./utils";

export const useHomeData = () => {
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [departmentsError, setDepartmentsError] = useState("");

  const [featuredShops, setFeaturedShops] = useState([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [shopsError, setShopsError] = useState("");

  const [featuredServices, setFeaturedServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchIndustries = async () => {
      setIsLoadingDepartments(true);
      setDepartmentsError("");

      try {
        const response = await fetch(`${API_BASE_URL}/shops/industries`);
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load departments");
        }

        const industries = Array.isArray(payload?.industries) ? payload.industries : [];
        const names = industries
          .map((industry) => (typeof industry?.name === "string" ? industry.name.trim() : ""))
          .filter(Boolean);

        if (!cancelled) {
          setDepartments(names);
        }
      } catch (error) {
        if (!cancelled) {
          setDepartmentsError(error.message || "Failed to load departments");
          setDepartments(FALLBACK_DEPARTMENTS);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDepartments(false);
        }
      }
    };

    fetchIndustries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchFeaturedContent = async () => {
      setIsLoadingShops(true);
      setShopsError("");
      setIsLoadingServices(true);
      setServicesError("");

      try {
        const shopsResponse = await fetch(`${API_BASE_URL}/shops`);
        const shopsPayload = await parseJsonSafely(shopsResponse);

        if (!shopsResponse.ok) {
          throw new Error(shopsPayload?.message || "Failed to load shops");
        }

        const shops = Array.isArray(shopsPayload?.shops) ? shopsPayload.shops : [];

        const shopCards = shops.slice(0, 6).map((shop) => {
          const location = [shop?.address?.city, shop?.address?.state].filter(Boolean).join(", ");

          return {
            id: shop?._id,
            name:
              typeof shop?.shopName === "string" && shop.shopName.trim()
                ? shop.shopName.trim()
                : "Unnamed Shop",
            rating: Number(shop?.ratingAvg) || 0,
            ratingCount: Number(shop?.ratingCount) || 0,
            location: location || "Location not available",

            label:
              typeof shop?.description === "string" && shop.description.trim()
                ? shop.description.trim()
                : "Professional service shop",
            images: shop?.images || []

          };
        });

        if (!cancelled) {
          setFeaturedShops(shopCards);
        }

        if (shops.length === 0) {
          if (!cancelled) {
            setFeaturedServices([]);
          }
          return;
        }

        const shopLookup = new Map(shops.map((shop) => [shop._id, shop]));
        const candidateShops = shops.slice(0, 8);

        const serviceGroups = await Promise.all(
          candidateShops.map(async (shop) => {
            const response = await fetch(`${API_BASE_URL}/shops/${shop._id}/services`);
            const payload = await parseJsonSafely(response);
            if (!response.ok) return [];
            return Array.isArray(payload?.services) ? payload.services : [];
          })
        );

        const flattenedServices = serviceGroups
          .flat()
          .slice(0, FEATURED_SERVICE_LIMIT)
          .map((service, index) => {
            const shop = shopLookup.get(service?.shopId);
            const title = typeof service?.name === "string" ? service.name.trim() : "";
            const shopName =
              typeof shop?.shopName === "string" && shop.shopName.trim() ? shop.shopName.trim() : "Shop";

            return {
              shop: {
                _id: shop?._id,
                shopName: shop?.shopName || "Unnamed Shop",
                images: shop?.images || [],
                address: shop?.address || {},
                ratingAvg: shop?.ratingAvg || 0,
                ratingCount: shop?.ratingCount || 0
              },
              service: {
                _id: service?._id,
                name: title || "Unnamed Service",
                category: service?.category || "",
                price: service?.price,
                images: service?.images || []
              }
            };
          });

        if (!cancelled) {
          setFeaturedServices(flattenedServices);
        }
      } catch (error) {
        if (!cancelled) {
          setShopsError(error.message || "Failed to load shops");
          setFeaturedShops([]);
          setServicesError(error.message || "Failed to load services");
          setFeaturedServices([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShops(false);
          setIsLoadingServices(false);
        }
      }
    };

    fetchFeaturedContent();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    departments,
    isLoadingDepartments,
    departmentsError,
    featuredShops,
    isLoadingShops,
    shopsError,
    featuredServices,
    isLoadingServices,
    servicesError
  };
};
