// Carte SVG simplifiée de la Côte d'Ivoire avec régions cliquables
// Les paths sont des approximations des formes des régions principales

const CI_MAP = {
  viewBox: "0 0 500 520",
  regions: [
    { id: "abidjan",      name: "Abidjan",           d: "M230,400 L255,390 L270,405 L260,425 L235,420 Z" },
    { id: "lagunes",      name: "Lagunes",            d: "M200,370 L240,360 L260,375 L255,395 L230,400 L210,390 Z" },
    { id: "grands-ponts", name: "Grands Ponts",       d: "M160,350 L200,340 L210,360 L200,380 L175,375 L155,365 Z" },
    { id: "agnebi",       name: "Agnéby-Tiassa",      d: "M220,330 L255,320 L265,345 L250,360 L230,355 L215,345 Z" },
    { id: "me",           name: "Mé",                 d: "M255,310 L290,305 L300,330 L285,350 L262,345 L252,330 Z" },
    { id: "sud-comoe",    name: "Sud-Comoé",          d: "M295,330 L330,320 L340,350 L320,365 L298,358 Z" },
    { id: "loh-djiboua",  name: "Lôh-Djiboua",       d: "M170,300 L210,295 L220,320 L205,338 L175,335 L162,318 Z" },
    { id: "goh",          name: "Gôh",                d: "M155,260 L190,255 L200,285 L185,300 L160,295 L148,278 Z" },
    { id: "cavally",      name: "Cavally",            d: "M95,285 L135,275 L145,305 L130,320 L100,315 L88,300 Z" },
    { id: "guemon",       name: "Guémon",             d: "M120,250 L158,245 L165,272 L148,286 L122,280 L112,265 Z" },
    { id: "marahoue",     name: "Marahoué",           d: "M180,220 L218,215 L225,245 L210,258 L184,252 L172,237 Z" },
    { id: "haut-sassandra",name:"Haut-Sassandra",     d: "M140,210 L178,205 L185,232 L168,245 L142,240 L132,225 Z" },
    { id: "san-pedro",    name: "San-Pédro",          d: "M130,335 L165,325 L172,352 L155,368 L132,360 L122,348 Z" },
    { id: "gbokle",       name: "Gbôklé",             d: "M105,310 L135,305 L140,328 L125,342 L105,335 L97,322 Z" },
    { id: "nawa",         name: "Nawa",               d: "M145,310 L172,300 L178,325 L162,340 L145,332 L137,320 Z" },
    { id: "bafing",       name: "Bafing",             d: "M115,175 L150,170 L158,198 L140,212 L115,206 L105,190 Z" },
    { id: "folon",        name: "Folon",              d: "M105,140 L140,135 L148,163 L130,177 L106,170 L96,155 Z" },
    { id: "kabadougou",   name: "Kabadougou",         d: "M140,150 L175,145 L182,173 L165,186 L141,180 L132,165 Z" },
    { id: "bagoue",       name: "Bagoué",             d: "M160,120 L198,116 L205,145 L188,158 L162,152 L152,137 Z" },
    { id: "poro",         name: "Poro",               d: "M195,130 L232,126 L238,155 L222,168 L197,162 L187,147 Z" },
    { id: "tchologo",     name: "Tchologo",           d: "M230,115 L268,110 L274,140 L257,152 L232,147 L222,132 Z" },
    { id: "hambol",       name: "Hambol",             d: "M255,165 L292,160 L298,190 L280,202 L256,197 L246,182 Z" },
    { id: "gbeke",        name: "Gbêkê",              d: "M220,175 L255,170 L260,198 L244,210 L220,205 L210,190 Z" },
    { id: "belier",       name: "Béler",              d: "M255,215 L290,210 L295,240 L278,252 L254,247 L245,232 Z" },
    { id: "moronou",      name: "Moronou",            d: "M290,240 L325,235 L330,265 L313,277 L289,272 L280,257 Z" },
    { id: "n-zi",         name: "N'Zi",               d: "M270,255 L305,250 L310,280 L293,292 L269,287 L260,272 Z" },
    { id: "iffou",        name: "Iffou",              d: "M305,265 L340,260 L345,290 L328,302 L304,297 L295,282 Z" },
    { id: "gontougo",     name: "Gontougo",           d: "M320,200 L358,195 L363,226 L346,237 L322,232 L313,217 Z" },
    { id: "bounkani",     name: "Bounkani",           d: "M340,145 L378,140 L383,171 L366,182 L342,177 L332,162 Z" },
    { id: "indenie-djuablin", name:"Indénié-Djuablin", d: "M345,270 L380,265 L385,296 L368,307 L344,302 L335,287 Z" },
    { id: "sud-bandama",  name: "Sud-Bandama",        d: "M195,295 L230,290 L235,318 L218,330 L195,325 L185,310 Z" },
  ]
};
