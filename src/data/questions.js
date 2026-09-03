// Banco de preguntas de Nariño Aventura 3D, agrupadas por id de sitio turístico.
// Cada pregunta tiene `text`, una lista `answers` (una sola con `correct: true`)
// y una `hint` que los NPC pueden revelar al jugador.
// Copiado íntegro del bundle original: no alterar textos, respuestas ni pistas.

export const QUESTIONS = {
    lajas: [{
        text: "¿En qué año se terminó de construir el Santuario de Las Lajas actual?",
        answers: [{
            text: "1949",
            correct: true
        }, {
            text: "1916",
            correct: false
        }, {
            text: "1880",
            correct: false
        }],
        hint: "Su construcción duró 33 años, durante la primera mitad del siglo XX."
    }, {
        text: "¿Sobre el cañón de qué río se levantó el santuario?",
        answers: [{
            text: "Río Guáitara",
            correct: true
        }, {
            text: "Río Mayo",
            correct: false
        }, {
            text: "Río Patía",
            correct: false
        }],
        hint: "Es el mismo río que da nombre a una región del sur de Nariño."
    }, {
        text: "¿Qué estilo arquitectónico tiene la basílica de Las Lajas?",
        answers: [{
            text: "Neogótico",
            correct: true
        }, {
            text: "Barroco",
            correct: false
        }, {
            text: "Moderno",
            correct: false
        }],
        hint: "Sus torres puntiagudas y arcos recuerdan a las catedrales medievales."
    }],
    cocha: [{
        text: "¿Cómo se llama la isla situada dentro de la Laguna de La Cocha?",
        answers: [{
            text: "Isla La Corota",
            correct: true
        }, {
            text: "Isla Gorgona",
            correct: false
        }, {
            text: "Isla del Sol",
            correct: false
        }],
        hint: "Es un Santuario de Flora y Fauna, de las áreas protegidas más pequeñas del país."
    }, {
        text: "¿Qué lugar ocupa La Cocha entre los lagos naturales de Colombia?",
        answers: [{
            text: "El segundo más grande",
            correct: true
        }, {
            text: "El más grande",
            correct: false
        }, {
            text: "El quinto más grande",
            correct: false
        }],
        hint: "Solo un lago colombiano lo supera en tamaño."
    }, {
        text: "¿Cerca de qué ciudad se encuentra La Cocha?",
        answers: [{
            text: "Pasto",
            correct: true
        }, {
            text: "Ipiales",
            correct: false
        }, {
            text: "Tumaco",
            correct: false
        }],
        hint: "Está en el corregimiento de El Encano, capital del departamento."
    }],
    galeras: [{
        text: "¿Qué característica define al Volcán Galeras?",
        answers: [{
            text: "Es un volcán activo",
            correct: true
        }, {
            text: "Está extinto",
            correct: false
        }, {
            text: "Es un glaciar",
            correct: false
        }],
        hint: "Es uno de los volcanes más vigilados de Colombia."
    }, {
        text: "¿Qué ciudad se encuentra a los pies del Galeras?",
        answers: [{
            text: "San Juan de Pasto",
            correct: true
        }, {
            text: "Túquerres",
            correct: false
        }, {
            text: "Ipiales",
            correct: false
        }],
        hint: "Es la capital de Nariño."
    }, {
        text: "¿Cuál es la altura aproximada del Galeras?",
        answers: [{
            text: "Unos 4.276 m",
            correct: true
        }, {
            text: "Unos 2.000 m",
            correct: false
        }, {
            text: "Unos 6.000 m",
            correct: false
        }],
        hint: "Supera los cuatro mil metros sobre el nivel del mar."
    }],
    cumbal: [{
        text: "¿Qué distingue al Volcán Cumbal en Nariño?",
        answers: [{
            text: "Es el nevado más alto del departamento",
            correct: true
        }, {
            text: "Es el más bajo",
            correct: false
        }, {
            text: "Está en la costa",
            correct: false
        }],
        hint: "Su cima está cubierta de hielo."
    }, {
        text: "¿Cuál es la altura aproximada del Cumbal?",
        answers: [{
            text: "Unos 4.764 m",
            correct: true
        }, {
            text: "Unos 3.000 m",
            correct: false
        }, {
            text: "Unos 5.500 m",
            correct: false
        }],
        hint: "Es el punto más alto de Nariño."
    }, {
        text: "¿En qué municipio se encuentra el Volcán Cumbal?",
        answers: [{
            text: "Cumbal",
            correct: true
        }, {
            text: "Sandoná",
            correct: false
        }, {
            text: "Ricaurte",
            correct: false
        }],
        hint: "Lleva el mismo nombre del municipio."
    }],
    azufral: [{
        text: "¿De qué color es el agua de la Laguna Verde de Azufral?",
        answers: [{
            text: "Verde turquesa",
            correct: true
        }, {
            text: "Roja",
            correct: false
        }, {
            text: "Negra",
            correct: false
        }],
        hint: "El nombre del sitio lo delata."
    }, {
        text: "¿A qué se debe el color del agua de la laguna?",
        answers: [{
            text: "A los minerales de azufre",
            correct: true
        }, {
            text: "A las algas",
            correct: false
        }, {
            text: "A la contaminación",
            correct: false
        }],
        hint: "El volcán que la contiene lleva ese mineral en su nombre."
    }, {
        text: "¿En qué municipio se encuentra la Laguna Verde de Azufral?",
        answers: [{
            text: "Túquerres",
            correct: true
        }, {
            text: "Pasto",
            correct: false
        }, {
            text: "Tumaco",
            correct: false
        }],
        hint: "Es un municipio del altiplano nariñense."
    }],
    catedral: [{
        text: "¿En qué ciudad está la Catedral de Pasto?",
        answers: [{
            text: "San Juan de Pasto",
            correct: true
        }, {
            text: "Ipiales",
            correct: false
        }, {
            text: "Tumaco",
            correct: false
        }],
        hint: "Es la capital del departamento de Nariño."
    }, {
        text: "¿Qué famoso carnaval se celebra en Pasto?",
        answers: [{
            text: "Carnaval de Negros y Blancos",
            correct: true
        }, {
            text: "Carnaval de Barranquilla",
            correct: false
        }, {
            text: "Carnaval de Riosucio",
            correct: false
        }],
        hint: "Es Patrimonio Cultural Inmaterial de la Humanidad."
    }, {
        text: "¿Qué estilo predomina en la fachada de la Catedral de Pasto?",
        answers: [{
            text: "Republicano",
            correct: true
        }, {
            text: "Gótico puro",
            correct: false
        }, {
            text: "Futurista",
            correct: false
        }],
        hint: "Es un estilo típico de inicios del siglo XX en Colombia."
    }],
    planada: [{
        text: "¿Qué tipo de ecosistema protege la Reserva La Planada?",
        answers: [{
            text: "Bosque de niebla",
            correct: true
        }, {
            text: "Desierto",
            correct: false
        }, {
            text: "Manglar",
            correct: false
        }],
        hint: "Su nombre evoca la humedad constante entre las nubes."
    }, {
        text: "¿Qué pueblo indígena habita el territorio de La Planada?",
        answers: [{
            text: "El pueblo Awá",
            correct: true
        }, {
            text: "El pueblo Wayúu",
            correct: false
        }, {
            text: "El pueblo Muisca",
            correct: false
        }],
        hint: "Es un pueblo del piedemonte costero del suroccidente."
    }, {
        text: "¿En qué municipio se ubica la Reserva La Planada?",
        answers: [{
            text: "Ricaurte",
            correct: true
        }, {
            text: "Cumbal",
            correct: false
        }, {
            text: "Sandoná",
            correct: false
        }],
        hint: "Está en el occidente de Nariño, camino a la costa."
    }],
    morro: [{
        text: "¿En qué océano se encuentra El Morro de Tumaco?",
        answers: [{
            text: "Océano Pacífico",
            correct: true
        }, {
            text: "Océano Atlántico",
            correct: false
        }, {
            text: "Mar Caribe",
            correct: false
        }],
        hint: "Tumaco es el principal puerto del sur de la costa occidental."
    }, {
        text: "¿De qué ciudad es emblema El Morro?",
        answers: [{
            text: "San Andrés de Tumaco",
            correct: true
        }, {
            text: "Pasto",
            correct: false
        }, {
            text: "Ipiales",
            correct: false
        }],
        hint: 'Conocida como "la perla del Pacífico".'
    }, {
        text: "¿Qué es El Morro de Tumaco?",
        answers: [{
            text: "Una formación rocosa junto al mar",
            correct: true
        }, {
            text: "Un volcán nevado",
            correct: false
        }, {
            text: "Una catedral",
            correct: false
        }],
        hint: "Está rodeado de playas y palmeras."
    }],
    chiles: [{
        text: "¿Con qué país comparte frontera el Volcán Chiles?",
        answers: [{
            text: "Ecuador",
            correct: true
        }, {
            text: "Perú",
            correct: false
        }, {
            text: "Brasil",
            correct: false
        }],
        hint: "Nariño limita al sur con ese país."
    }, {
        text: "¿Cuál es la altura aproximada del Volcán Chiles?",
        answers: [{
            text: "Unos 4.748 m",
            correct: true
        }, {
            text: "Unos 2.500 m",
            correct: false
        }, {
            text: "Unos 6.200 m",
            correct: false
        }],
        hint: "Ronda los 4.700 metros de altitud."
    }, {
        text: "¿Qué atractivo natural rodea al Volcán Chiles?",
        answers: [{
            text: "Páramos y aguas termales",
            correct: true
        }, {
            text: "Playas de arena",
            correct: false
        }, {
            text: "Selva amazónica",
            correct: false
        }],
        hint: "Es un paisaje altoandino frío."
    }],
    sandona: [{
        text: "¿Por qué artesanía es famosa Sandoná?",
        answers: [{
            text: "El tejido en paja toquilla",
            correct: true
        }, {
            text: "La cerámica negra",
            correct: false
        }, {
            text: "Los tejidos en lana",
            correct: false
        }],
        hint: "Con esa fibra se elaboran sombreros a mano."
    }, {
        text: "¿Qué producto típico se fabrica con la paja toquilla en Sandoná?",
        answers: [{
            text: "Sombreros",
            correct: true
        }, {
            text: "Zapatos de cuero",
            correct: false
        }, {
            text: "Ollas de barro",
            correct: false
        }],
        hint: "Es una prenda para protegerse del sol."
    }, {
        text: "¿En qué región de Nariño se ubica Sandoná?",
        answers: [{
            text: "La región del Guáitara",
            correct: true
        }, {
            text: "La costa pacífica",
            correct: false
        }, {
            text: "La frontera amazónica",
            correct: false
        }],
        hint: "Comparte nombre con el río del Santuario de Las Lajas."
    }]
};
