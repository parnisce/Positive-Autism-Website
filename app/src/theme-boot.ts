/**
 * Runs in <head> before the page paints, so a visitor who chose (or whose device prefers) the
 * dark theme or Spanish never sees a flash of the light/English version first.
 * Keep the storage keys in sync with components/pa/prefs.tsx.
 */
export const THEME_BOOT = `try{var t=localStorage.getItem("pa-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;var l=localStorage.getItem("pa-lang");if(l==="en"||l==="es"){document.documentElement.setAttribute("lang",l)}else if((navigator.language||"").toLowerCase().indexOf("es")===0){document.documentElement.setAttribute("lang","es")}if(sessionStorage.getItem("pa-loaded")==="1"){document.documentElement.classList.add("pa-seen")}}catch(e){}`;
