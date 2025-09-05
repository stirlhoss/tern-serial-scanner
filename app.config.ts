import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import devtools from "solid-devtools/vite";

export default defineConfig({
    vite: {
        plugins: [
            tailwindcss(),
            devtools({
                /* features options - all disabled by default */
                autoname: true, // e.g. enable autoname
            }),
        ],
        server: {
            allowedHosts: ["shortly-master-marmot.ngrok-free.app"],
        },
    },
});
