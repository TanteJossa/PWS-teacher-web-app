// supabase/functions/set-custom-claims/index.ts
import {
    serve
    // @ts-ignore
} from "https://deno.land/std@0.168.0/http/server.ts";
import {
    invokePy
    // @ts-ignore
} from "https://deno.land/x/python@0.2.5/mod.ts";


serve(async (req) => {
    try {
        const json = await req.json();
        const py = await invokePy({
            //The relative path to you python script
            script: "./set_custom_claims.py", //path to the python script
            args: [JSON.stringify(json), "{}"], //event, context
            //Import the correct python version!
            import: "python3.11",

        });
        console.log(py)
        return new Response(
            py as string, {
                headers: {
                    "Content-Type": "application/json"
                },
            },
        );
    } catch (error) {
        console.error(error);
        return new Response(error.message, {
            status: 500
        });
    }
});