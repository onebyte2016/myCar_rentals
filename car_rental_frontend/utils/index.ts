import { CarProps, FilterProps } from "@/types";

export async function fetchCars(filters: FilterProps) {
  const {manufacturer, year, model, limit, fuel} = filters;

  const response = await fetch(
    `http://127.0.0.1:8000/core/v1/cars/?make=${manufacturer}&year=${year}&model=${model}&limit=${limit}&fuel_type=${fuel}`
  );

  const contentType = response.headers.get("content-type");

  const text = await response.text();
  console.log("Response:", text);

  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Backend did not return JSON. Got HTML or error page.");
  }

  return JSON.parse(text);
}

export const calculateCarRent = (city_mpg: number, year: number) => {
  const basePricePerDay = 0.01; // Base rental price per day in dollars
  const mileageFactor = 0.01; // Additional rate per mile driven
  const ageFactor = 0.05; // Additional rate per year of vehicle age

  // Calculate additional rate based on mileage and age
  const mileageRate = city_mpg * mileageFactor;
  const ageRate = (new Date().getFullYear() - year) * ageFactor;

  // Calculate total rental rate per day
  const rentalRatePerDay = basePricePerDay + mileageRate + ageRate;

  return rentalRatePerDay.toFixed(0);
};


export function getCarView(url: string, view: "front" | "side" | "zoom" | "angle") {
  if (!url) return "";

  const base = url.split("/upload/")[0];
  const rest = url.split("/upload/")[1];

  let transform = "";

  switch (view) {
    case "front":
      transform = "c_fill,w_600,h_400,g_auto,q_auto,f_auto";
      break;

    case "side":
      transform = "c_fill,w_600,h_400,g_east,q_auto,f_auto";
      break;

    case "zoom":
      transform = "c_crop,w_600,h_400,zoom_1.5,q_auto,f_auto";
      break;

    case "angle":
      transform = "c_fill,w_600,h_400,g_south,q_auto,f_auto";
      break;
  }

  return `${base}/upload/${transform}/${rest}`;
}

export const generateCarImageUrl = (car: CarProps, angle?: string) => {
  if (!car.imageurl) return "/placeholder-car.png";

  return car.imageurl.replace(
    "/upload/",
    "/upload/c_fill,w_600,h_400,q_auto,f_auto/"
  );
};


export const updateSearchParams = (type:string, value:string) => {
   const searchParams = new URLSearchParams(window.location.search);
      searchParams.set(type, value)
  
      const newPathName = `${window.location.pathname}?${searchParams.toString()}`
      return newPathName;
}