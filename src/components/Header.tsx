import Logo from "../assets/agora.svg"

export default function Header(){
  return(
    <header className="w-full h-20 flex flex-row justify-center border-2 border-gray-200">
      <div className="h-full w-2/3 flex flex-row justify-around items-center">
        <img src={Logo.src} className="w-auto h-10 hover:cursor-pointer" />
        <div className="w-1/2 h-2/3 border-green-500 rounded-3xl border-3 hover:cursor-pointer flex flex-row justify-center items-center">
          Buscar cidade
        </div>
        <div className="w-16 h-16 rounded-full bg-gray-300 border-green-500 hover:cursor-pointer border-3"></div>
      </div>
    </header>
  );
}