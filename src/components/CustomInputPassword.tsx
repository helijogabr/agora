interface CustomInputProps{
    title: string
    name: string
}

// TODO: implementar toggle de visibilidade de senha.
export default function CustomInputPassword(props: CustomInputProps){
    return(
        <div className="relative
            h-15 w-80
            justify-center
            md:w-120 ">
            <input type="password" placeholder="" id={props.name} required name={props.name} className="
                focus:outline-none
                peer
                h-full w-full rounded-xl
                pl-3.5 pt-3
                transition-all duration-150
                border
                focus:border-2 focus:border-[#50be91]"/>

            <label htmlFor={props.name} className="
                absolute left-4 bottom-4.5
                font-bold
                transition-all duration-150
                peer-focus:bottom-8.5 peer-focus:text-sm
                peer-not-placeholder-shown:bottom-8.5 peer-not-placeholder-shown::text-sm
                text-gray-500">
                {props.title}
            </label>
        </div>
    );
}
