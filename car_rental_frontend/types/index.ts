import { MouseEventHandler } from "react";
import Image from "next/image";

export interface CustomButtonProps {
    title: string;
    containerStyles?: string;
    handleClick?: MouseEventHandler<HTMLButtonElement>;
    btnType?: "button" | "submit";
    textStyles?: string;
    rightIcon?: string;
    isDisabled?: boolean;
}
export interface SearchManufacturerProps {
    manufacturer: string;
    setManufacturer: (manufacturer: string)=>void;
}

export interface CarProps{
id:number;
city_mpg:number;
class:string;
combination_mpg:number;
cylinders:number;
displacement:number;
drive:string;
fuel_type:string;
highway_mpg:number;
make:string;
model:string;
transmission:string;
year:number;
imageurl:string,
image:string,
price_per_day:number;
}

export interface FilterProps{
    manufacturer: string;
    year: string | number;
    fuel: string;
    limit: string | number;
    model: string;
}

export interface OptionProps{
    title: string;
    value: string;
}
export interface CustomFilterProps{
    title: string;
    options: OptionProps[];
}