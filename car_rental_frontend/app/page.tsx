// import Hero from "@/components/Hero";
import { CarCard, CustomButton, CustomFilter, Hero, SearchBar } from "@/components";
import { fuels, manufacturers, yearsOfProduction } from "@/constants";
import { fetchCars } from "@/utils";
import Image from "next/image";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const allCars = await fetchCars({
    manufacturer: (params.manufacturer as string) || '',
    year: (params.year as string) || '',
    fuel: (params.fuel as string) || '',
    model: (params.model as string) || '',
    limit: (params.limit as string) || 10,
  });
  
  const isDataEmpty = !Array.isArray(allCars) || allCars.length < 1
  || !allCars;
  return (
   
      <main className="overflow-hidden">
       <Hero/>
       
       <div className="mt-12 padding-x padding-y 
       max-width" id="discover">
        <div className="home__text-container">
          <h1 className="text-4xl 
          font-extrabold">Car Catalogue</h1>
          <p>Explore the cars you might like</p>
        </div>
        <div className="home__filters">
          <SearchBar />
          <div className="home__filter-container">
            <CustomFilter title="fuel" options={fuels}/>
            <CustomFilter title="year" options={yearsOfProduction} />
          </div>
        </div>
        {!isDataEmpty ? (
          <section>
            <div className="home__cars-wrapper">
              {allCars?.map((car, index) => (
                <CarCard key={car.id || index} car={car} />
              ))}
            </div>
          </section>
        ) : (
          <div className="home__error-container">
            <h2 className="text-black text-xl font-bold">
              Oops, no result
            </h2>
            <p>{allCars?.message}</p>
          </div>
        )}
       
       </div>
      </main>
    
  );
}
