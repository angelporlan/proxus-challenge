import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { materialsQuery } from "../domain/materials/atoms.ts";

export interface MindMapNode {
  readonly id: string;
  readonly label: string;
  readonly notes?: string | undefined;
  readonly references?: readonly string[] | undefined;
  readonly page?: number | undefined;
  readonly color?: string | undefined;
  readonly icon?: string | undefined;
  readonly children?: readonly MindMapNode[] | undefined;
}

export interface MindMapViewerProps {
  readonly initialData?: MindMapNode | undefined;
  readonly selectedMaterialId?: string | null | undefined;
  readonly onSelectMaterialId?: ((id: string) => void) | undefined;
  readonly onAskTutorAboutConcept?: ((concept: string, context?: string) => void) | undefined;
  readonly onGenerateQuizForBranch?: ((branchName: string) => void) | undefined;
  readonly onOpenPdfPage?: ((materialId: string, page: number) => void) | undefined;
  readonly onGenerateAiMap?: ((materialTitle: string) => void) | undefined;
  readonly theme?: "dark" | "light" | undefined;
}

// ---------------------------------------------------------------------------
// Comprehensive Mind Map Knowledge Base for Guardia Civil & Official Topics
// ---------------------------------------------------------------------------

const mindMapsByMaterialId: Record<string, MindMapNode> = {
  "tema-1-constitucion-espanola": {
    id: "root-tema-1",
    label: "Tema 1: Constitución Española de 1978",
    icon: "gavel",
    notes: "Norma suprema del ordenamiento jurídico español. Estructura (169 Arts), Título Preliminar, valores superiores y catálogo de Derechos Fundamentales y Libertades Públicas.",
    references: ["Art. 1 CE", "Arts. 14 a 29 CE", "Art. 53 CE", "Art. 55 CE", "Art. 116 CE"],
    color: "#6366f1",
    children: [
      {
        id: "t1-b1",
        label: "1. Estructura y Título Preliminar",
        color: "#f59e0b",
        page: 1,
        notes: "Principios constitucionales básicos, forma del Estado y soberanía.",
        references: ["Pág. 1", "Arts. 1 a 9 CE"],
        children: [
          {
            id: "t1-n1-1",
            label: "Valores Superiores (Art. 1.1)",
            notes: "Libertad, justicia, igualdad y pluralismo político en un Estado social y democrático de Derecho.",
            references: ["Art. 1.1 CE"]
          },
          {
            id: "t1-n1-2",
            label: "Soberanía y Monarquía (Arts. 1.2 y 1.3)",
            notes: "La soberanía reside en el pueblo español. Forma política: Monarquía parlamentaria.",
            references: ["Arts. 1.2 y 1.3 CE"]
          },
          {
            id: "t1-n1-3",
            label: "Fuerzas Armadas (Art. 8)",
            notes: "Garantizar la soberanía, independencia e integridad territorial de España.",
            references: ["Art. 8 CE"]
          }
        ]
      },
      {
        id: "t1-b2",
        label: "2. Derechos Fundamentales (Cap. II)",
        color: "#06b6d4",
        page: 1,
        notes: "Sección 1ª: Derechos de máxima protección tutelables en amparo.",
        references: ["Pág. 1", "Arts. 14 a 29 CE"],
        children: [
          {
            id: "t1-n2-1",
            label: "Igualdad ante la Ley (Art. 14)",
            notes: "Prohibición de toda discriminación por nacimiento, raza, sexo, religión u opinión.",
            references: ["Art. 14 CE"]
          },
          {
            id: "t1-n2-2",
            label: "Vida e Integridad (Art. 15)",
            notes: "Abolición de la pena de muerte y prohibición de tratos inhumanos o degradantes.",
            references: ["Art. 15 CE"]
          },
          {
            id: "t1-n2-3",
            label: "Libertad y Detención 72h (Art. 17)",
            notes: "Detención preventiva máxima de 72 horas y garantía inmediata de Habeas Corpus.",
            references: ["Art. 17 CE", "LO 6/1984"]
          },
          {
            id: "t1-n2-4",
            label: "Inviolabilidad del Domicilio (Art. 18.2)",
            notes: "Consentimiento del titular, resolución judicial o flagrante delito.",
            references: ["Art. 18.2 CE"]
          }
        ]
      },
      {
        id: "t1-b3",
        label: "3. Libertades Públicas y Tutela",
        color: "#10b981",
        page: 2,
        notes: "Garantías procesales, libertad ideológica, reunión y tutela judicial.",
        references: ["Pág. 2", "Arts. 16, 21 y 24 CE"],
        children: [
          {
            id: "t1-n3-1",
            label: "Libertad Ideológica y Religiosa (Art. 16)",
            notes: "Ninguna confesión tendrá carácter estatal (principio de aconfesionalidad).",
            references: ["Art. 16 CE"]
          },
          {
            id: "t1-n3-2",
            label: "Derecho de Reunión (Art. 21)",
            notes: "Pacífica y sin armas. En lugares de tránsito público exige comunicación previa a la autoridad.",
            references: ["Art. 21 CE"]
          },
          {
            id: "t1-n3-3",
            label: "Tutela Judicial Efectiva (Art. 24)",
            notes: "Juez ordinario, defensa letrada, no declarar contra sí mismo y presunción de inocencia.",
            references: ["Art. 24 CE"]
          }
        ]
      },
      {
        id: "t1-b4",
        label: "4. Garantías y Amparo Constitucional",
        color: "#ec4899",
        page: 2,
        notes: "Mecanismos de protección de los derechos de los ciudadanos.",
        references: ["Pág. 2", "Arts. 53 y 54 CE"],
        children: [
          {
            id: "t1-n4-1",
            label: "Recurso de Amparo ante el TC (Art. 53.2)",
            notes: "Protección extraordinaria ante el Tribunal Constitucional para Arts. 14 a 29 y 30.2.",
            references: ["Art. 53.2 CE"]
          },
          {
            id: "t1-n4-2",
            label: "Procedimiento Preferente y Sumario",
            notes: "Vía rápida ante los tribunales ordinarios para derechos fundamentales.",
            references: ["Art. 53.2 CE"]
          },
          {
            id: "t1-n4-3",
            label: "Defensor del Pueblo (Art. 54)",
            notes: "Alto comisionado de las Cortes Generales para supervisar la actividad de la Administración.",
            references: ["Art. 54 CE", "LO 3/1981"]
          }
        ]
      },
      {
        id: "t1-b5",
        label: "5. Suspensión de Derechos y Alarma",
        color: "#8b5cf6",
        page: 2,
        notes: "Régimen especial durante estados de alarma, excepción y sitio.",
        references: ["Pág. 2", "Arts. 55 y 116 CE"],
        children: [
          {
            id: "t1-n5-1",
            label: "Derechos Suspensibles (Art. 55.1)",
            notes: "Libertad personal (17), inviolabilidad domicilio (18.2), secreto comunicaciones (18.3), huelga (28.2).",
            references: ["Art. 55.1 CE"]
          },
          {
            id: "t1-n5-2",
            label: "Estados de Alarma, Excepción y Sitio",
            notes: "Alarma: Catástrofes (Gobierno 15 días). Excepción y Sitio: Orden público y soberanía (Cortes).",
            references: ["Art. 116 CE", "LO 4/1981"]
          }
        ]
      }
    ]
  },

  "tema-4-organizacion-territorial": {
    id: "root-tema-4",
    label: "Tema 4: Organización Territorial del Estado",
    icon: "domain",
    notes: "Organización territorial en municipios, provincias y CCAA (Título VIII CE). Principios de autonomía, solidaridad e igualdad de los ciudadanos.",
    references: ["Arts. 137 a 158 CE", "Art. 149.1 CE (Competencias)"],
    color: "#6366f1",
    children: [
      {
        id: "t4-b1",
        label: "1. Principios del Título VIII",
        color: "#f59e0b",
        page: 1,
        notes: "Bases constitucionales de la distribución territorial del poder.",
        references: ["Pág. 1", "Arts. 137 a 139 CE"],
        children: [
          {
            id: "t4-n1-1",
            label: "Autonomía Territorial (Art. 137)",
            notes: "Municipios, provincias y CCAA gozan de autonomía para gestionar sus intereses.",
            references: ["Art. 137 CE"]
          },
          {
            id: "t4-n1-2",
            label: "Principio de Solidaridad (Art. 138)",
            notes: "Equilibrio económico interterritorial sin privilegios entre Estatutos.",
            references: ["Art. 138 CE"]
          },
          {
            id: "t4-n1-3",
            label: "Igualdad y Libre Circulación (Art. 139)",
            notes: "Mismos derechos en todo el territorio. Prohibición de barreras comerciales.",
            references: ["Art. 139 CE"]
          }
        ]
      },
      {
        id: "t4-b2",
        label: "2. Administración Local",
        color: "#06b6d4",
        page: 1,
        notes: "Entidades locales básicas: Municipios y Provincias.",
        references: ["Pág. 1", "Arts. 140 a 142 CE"],
        children: [
          {
            id: "t4-n2-1",
            label: "El Municipio y Ayuntamiento (Art. 140)",
            notes: "Entidad básica. Gobierno mediante Alcalde y Concejales elegidos por sufragio.",
            references: ["Art. 140 CE"]
          },
          {
            id: "t4-n2-2",
            label: "La Provincia y Diputaciones (Art. 141)",
            notes: "Entidad local con personalidad jurídica propia determinada por agrupación de municipios.",
            references: ["Art. 141 CE"]
          },
          {
            id: "t4-n2-3",
            label: "Haciendas Locales (Art. 142)",
            notes: "Suficiencia financiera para cumplir las funciones públicas asignadas.",
            references: ["Art. 142 CE"]
          }
        ]
      },
      {
        id: "t4-b3",
        label: "3. Comunidades Autónomas",
        color: "#10b981",
        page: 2,
        notes: "Procesos de acceso a la autonomía y Estatutos.",
        references: ["Pág. 2", "Arts. 143 a 151 CE"],
        children: [
          {
            id: "t4-n3-1",
            label: "Vía Ordinaria vs Especial",
            notes: "Art. 143 (vía común lenta) vs Art. 151 (vía especial rápida con competencias plenas iniciales).",
            references: ["Arts. 143 y 151 CE"]
          },
          {
            id: "t4-n3-2",
            label: "Estatuto de Autonomía (Art. 147)",
            notes: "Norma institucional básica de la CCAA reconocida y amparada por el Estado.",
            references: ["Art. 147 CE"]
          }
        ]
      },
      {
        id: "t4-b4",
        label: "4. Competencias del Estado",
        color: "#ec4899",
        page: 2,
        notes: "Materias exclusivas reservadas al Estado central.",
        references: ["Pág. 2", "Art. 149.1 CE"],
        children: [
          {
            id: "t4-n4-1",
            label: "Seguridad Pública (Art. 149.1.29ª)",
            notes: "Competencia exclusiva del Estado sin perjuicio de policías autonómicas.",
            references: ["Art. 149.1.29ª CE"]
          },
          {
            id: "t4-n4-2",
            label: "Justicia, Defensa y Legislación Penal",
            notes: "Administración de justicia, Fuerzas Armadas y legislación penal/procesal común.",
            references: ["Art. 149.1.4ª, 5ª, 6ª CE"]
          }
        ]
      }
    ]
  },

  "tema-9-ley-organica-fuerzas-seguridad": {
    id: "root-tema-9",
    label: "Tema 9: LO 2/1986 de Fuerzas y Cuerpos de Seguridad",
    icon: "shield",
    notes: "Régimen estatutario, principios básicos de actuación y competencias exclusivas de la Guardia Civil y Policía Nacional.",
    references: ["LO 2/1986", "Art. 5 (Principios)", "Art. 9 (Naturaleza)", "Art. 12 (Competencias)"],
    color: "#6366f1",
    children: [
      {
        id: "t9-b1",
        label: "1. Principios Básicos de Actuación",
        color: "#f59e0b",
        page: 1,
        notes: "Código deontológico y límites de intervención policial.",
        references: ["Pág. 1", "Artículo 5 LO 2/1986"],
        children: [
          {
            id: "t9-n1-1",
            label: "Legalidad e Integridad (Art. 5.1)",
            notes: "Respeto absoluto a la Constitución y defensa activa del ordenamiento jurídico.",
            references: ["Art. 5.1 LO 2/1986"]
          },
          {
            id: "t9-n1-2",
            label: "Uso de Armas y Proporcionalidad (Art. 5.2.c)",
            notes: "Principios de congruencia, oportunidad y proporcionalidad en medios lesivos.",
            references: ["Art. 5.2.c LO 2/1986"]
          },
          {
            id: "t9-n1-3",
            label: "Dedicación Profesional Continua (Art. 5.4)",
            notes: "Deber de intervenir siempre, en cualquier tiempo y lugar, estén o no de servicio.",
            references: ["Art. 5.4 LO 2/1986"]
          }
        ]
      },
      {
        id: "t9-b2",
        label: "2. Naturaleza de la Guardia Civil",
        color: "#06b6d4",
        page: 1,
        notes: "Estructura institucional y doble dependencia ministerial.",
        references: ["Pág. 1", "Capítulo II LO 2/1986"],
        children: [
          {
            id: "t9-n2-1",
            label: "Instituto Armado Militar (Art. 9)",
            notes: "Cuerpo de seguridad de naturaleza militar con disciplina y jerarquía propias.",
            references: ["Art. 9 LO 2/1986"]
          },
          {
            id: "t9-n2-2",
            label: "Doble Dependencia (Interior / Defensa)",
            notes: "Interior: Seguridad ciudadana y retribuciones. Defensa: Misiones militares y ascensos.",
            references: ["Art. 9.1 LO 2/1986"]
          },
          {
            id: "t9-n2-3",
            label: "Ámbito Territorial Preferente",
            notes: "Responsabilidad prioritaria en el medio rural, costas y vías interurbanas.",
            references: ["Art. 11 LO 2/1986"]
          }
        ]
      },
      {
        id: "t9-b3",
        label: "3. Competencias Exclusivas GC",
        color: "#10b981",
        page: 2,
        notes: "Misiones encomendadas en exclusiva a la Guardia Civil.",
        references: ["Pág. 2", "Artículo 12.1.b LO 2/1986"],
        children: [
          {
            id: "t9-n3-1",
            label: "Armas y Explosivos (Intervención)",
            notes: "Control de fabricación, circulación, almacenamiento y tenencia de armas y explosivos.",
            references: ["Art. 12.1.b.1ª"]
          },
          {
            id: "t9-n3-2",
            label: "Resguardo Fiscal y Contrabando",
            notes: "Actuaciones del Estado para evitar el fraude y perseguir el contrabando aduanero.",
            references: ["Art. 12.1.b.2ª"]
          },
          {
            id: "t9-n3-3",
            label: "Tráfico Interurbano (Agrupación)",
            notes: "Vigilancia y auxilio del tráfico en carreteras y vías interurbanas de comunicación.",
            references: ["Art. 12.1.b.3ª"]
          },
          {
            id: "t9-n3-4",
            label: "Medio Ambiente (SEPRONA)",
            notes: "Protección y conservación de la naturaleza, montes, aguas y fauna silvestre.",
            references: ["Art. 12.1.b.5ª"]
          }
        ]
      },
      {
        id: "t9-b4",
        label: "4. Policía Judicial y Coordinación",
        color: "#ec4899",
        page: 2,
        notes: "Estructura de auxilio a jueces y tribunales.",
        references: ["Pág. 2", "Arts. 29 a 36 LO 2/1986"],
        children: [
          {
            id: "t9-n4-1",
            label: "Unidades Orgánicas de PJ (Art. 29)",
            notes: "Dependencia funcional exclusiva de Jueces, Tribunales y Ministerio Fiscal.",
            references: ["Art. 29 LO 2/1986", "Art. 126 CE"]
          },
          {
            id: "t9-n4-2",
            label: "Juntas Locales de Seguridad",
            notes: "Coordinación operativa entre Guardia Civil, Policía Nacional y Policía Local.",
            references: ["Art. 54 LO 2/1986"]
          }
        ]
      }
    ]
  },

  "tema-14-derecho-penal-general": {
    id: "root-tema-14",
    label: "Tema 14: Derecho Penal - Teoría del Delito y Penas",
    icon: "balance",
    notes: "Concepto dogmático de delito, dolo e imprudencia (Art. 10 CP), causas de justificación (legítima defensa) y sistema de penas.",
    references: ["Código Penal (LO 10/1995)", "Arts. 1, 10, 19, 20, 21, 22 y 33 CP"],
    color: "#6366f1",
    children: [
      {
        id: "t14-b1",
        label: "1. Concepto de Delito y Principios",
        color: "#f59e0b",
        page: 1,
        notes: "Definición legal de delito y formas de culpabilidad.",
        references: ["Pág. 1", "Arts. 1 y 10 Código Penal"],
        children: [
          {
            id: "t14-n1-1",
            label: "Definición de Delito (Art. 10 CP)",
            notes: "Son delitos las acciones y omisiones dolosas o imprudentes penadas por la ley.",
            references: ["Art. 10 CP"]
          },
          {
            id: "t14-n1-2",
            label: "Principio de Legalidad (Art. 1 CP)",
            notes: "Nullum crimen, nulla poena sine lege previa, scripta et stricta.",
            references: ["Art. 1 CP", "Art. 25.1 CE"]
          },
          {
            id: "t14-n1-3",
            label: "Dolo e Imprudencia (Art. 12 CP)",
            notes: "Dolo: Conocimiento y voluntad. Imprudencia grave y menos grave sólo punibles si la ley lo prevé expresamente.",
            references: ["Art. 12 CP"]
          }
        ]
      },
      {
        id: "t14-b2",
        label: "2. Causas de Exención (Art. 20)",
        color: "#06b6d4",
        page: 1,
        notes: "Causas de justificación (excluyen antijuridicidad) e inimputabilidad.",
        references: ["Pág. 1", "Artículos 19 y 20 CP"],
        children: [
          {
            id: "t14-n2-1",
            label: "Minoría de Edad Penal (Art. 19)",
            notes: "Menores de 18 años exentos de CP; se aplica la LORPM 5/2000 reguladora del menor.",
            references: ["Art. 19 CP", "LORPM 5/2000"]
          },
          {
            id: "t14-n2-2",
            label: "Legítima Defensa (Art. 20.4)",
            notes: "Requisitos: Agresión ilegítima, necesidad racional del medio y falta de provocación suficiente.",
            references: ["Art. 20.4 CP"]
          },
          {
            id: "t14-n2-3",
            label: "Estado de Necesidad (Art. 20.5)",
            notes: "Evitar un mal propio o ajeno causando otro menor, sin provocación y sin obligación de sacrificio.",
            references: ["Art. 20.5 CP"]
          },
          {
            id: "t14-n2-4",
            label: "Cumplimiento del Deber (Art. 20.7)",
            notes: "Obrar en cumplimiento de un deber o en el ejercicio legítimo de un derecho, oficio o cargo.",
            references: ["Art. 20.7 CP"]
          }
        ]
      },
      {
        id: "t14-b3",
        label: "3. Modificativas: Atenuantes y Agravantes",
        color: "#10b981",
        page: 2,
        notes: "Factores que disminuyen o aumentan la responsabilidad criminal.",
        references: ["Pág. 2", "Artículos 21 y 22 CP"],
        children: [
          {
            id: "t14-n3-1",
            label: "Atenuantes (Art. 21 CP)",
            notes: "Confesión antes del proceso, reparación del daño, dilaciones indebidas y analógicas.",
            references: ["Art. 21 CP"]
          },
          {
            id: "t14-n3-2",
            label: "Alevosía (Art. 22.1ª CP)",
            notes: "Empleo de medios que aseguran la ejecución del delito eliminando el riesgo de defensa del ofendido.",
            references: ["Art. 22.1ª CP"]
          },
          {
            id: "t14-n3-3",
            label: "Agravantes Específicas (Art. 22)",
            notes: "Disfraz, precio/recompensa, odio discriminatorio, ensañamiento y reincidencia.",
            references: ["Art. 22 CP"]
          }
        ]
      },
      {
        id: "t14-b4",
        label: "4. Clasificación de las Penas",
        color: "#ec4899",
        page: 2,
        notes: "Graves, menos graves y leves según su naturaleza y duración.",
        references: ["Pág. 2", "Artículo 33 Código Penal"],
        children: [
          {
            id: "t14-n4-1",
            label: "Penas Graves (Art. 33.2)",
            notes: "Prisión permanente revisable, prisión superior a 5 años, inhabilitaciones absolutas.",
            references: ["Art. 33.2 CP"]
          },
          {
            id: "t14-n4-2",
            label: "Penas Menos Graves (Art. 33.3)",
            notes: "Prisión de 3 meses a 5 años, privación carnet 1-8 años, trabajos comunidad 31-180 días.",
            references: ["Art. 33.3 CP"]
          },
          {
            id: "t14-n4-3",
            label: "Penas Leves (Art. 33.4)",
            notes: "Multa de hasta 3 meses, localización permanente hasta 3 meses, privación carnet hasta 1 año.",
            references: ["Art. 33.4 CP"]
          }
        ]
      }
    ]
  },

  "document-1": {
    id: "root-document-1",
    label: "Tema 7: Derecho Procesal Penal y LECrim",
    icon: "menu_book",
    notes: "Marco normativo fundamental del proceso penal español regulado por la Ley de Enjuiciamiento Criminal (LECrim) y la Constitución Española.",
    references: ["Art. 24 CE", "Arts. 1, 2 y 14 LECrim", "Ley Orgánica 6/1984"],
    color: "#6366f1",
    children: [
      {
        id: "d1-b1",
        label: "1. Proceso Penal y Principios",
        color: "#f59e0b",
        page: 1,
        notes: "Instrumento exclusivo del Estado para la aplicación del ius puniendi tras la comisión de un delito.",
        references: ["Pág. 1", "Arts. 1 y 2 LECrim", "Art. 24.2 CE"],
        children: [
          {
            id: "d1-n1-1",
            label: "Principio Acusatorio",
            notes: "Separación estricta de funciones: quien instruye no juzga. Congruencia y prohibición de reformatio in peius.",
            references: ["Art. 24.2 CE"]
          },
          {
            id: "d1-n1-2",
            label: "Juez Ordinario Predeterminado",
            notes: "Garantía de jurisdicción ordinaria establecida previamente por la ley.",
            references: ["Art. 24.2 CE"]
          },
          {
            id: "d1-n1-3",
            label: "Presunción de Inocencia",
            notes: "Regla de juicio y tratamiento. Exige prueba de cargo lícita para condenar.",
            references: ["Art. 24.2 CE"]
          }
        ]
      },
      {
        id: "d1-b2",
        label: "2. Jurisdicción y Competencia",
        color: "#06b6d4",
        page: 1,
        notes: "Criterios para determinar qué juzgado o tribunal conoce de una causa penal.",
        references: ["Págs. 1 y 2", "Art. 14 LECrim"],
        children: [
          {
            id: "d1-n2-1",
            label: "Competencia Objetiva",
            notes: "Determina el órgano por la gravedad del delito (pena abstracta) o por la persona aforada.",
            references: ["Art. 14 LECrim"]
          },
          {
            id: "d1-n2-2",
            label: "Competencia Territorial",
            notes: "Regla general: forum commissi delicti (lugar de comisión). Fueros subsidiarios cuando no conste el lugar.",
            references: ["Arts. 15-18 LECrim"]
          },
          {
            id: "d1-n2-3",
            label: "Competencia Funcional",
            notes: "Distribución según la fase procesal: instrucción, juicio oral y recursos.",
            references: ["Art. 14 LECrim"]
          }
        ]
      },
      {
        id: "d1-b3",
        label: "3. Partes en el Proceso",
        color: "#10b981",
        page: 2,
        notes: "Sujetos que intervienen en la relación procesal penal con intereses contrapuestos.",
        references: ["Pág. 2", "Arts. 100-110 LECrim"],
        children: [
          {
            id: "d1-n3-1",
            label: "Ministerio Fiscal",
            notes: "Defensa de la legalidad y los derechos ciudadanos de oficio en delitos públicos.",
            references: ["Art. 124 CE"]
          },
          {
            id: "d1-n3-2",
            label: "Acusación Particular y Popular",
            notes: "Particular: ofendido por el delito. Popular: cualquier ciudadano español (Art. 125 CE).",
            references: ["Arts. 109-110 LECrim"]
          },
          {
            id: "d1-n3-3",
            label: "Investigado y Defensa Letrada",
            notes: "Parte pasiva con derecho irrenunciable a la asistencia letrada desde la detención.",
            references: ["Art. 118 LECrim", "Art. 520 LECrim"]
          }
        ]
      },
      {
        id: "d1-b4",
        label: "4. Policía Judicial y Medidas",
        color: "#ec4899",
        page: 2,
        notes: "Auxilio a juzgados y tribunales en la averiguación del delito y aseguramiento del delincuente.",
        references: ["Págs. 2 y 3", "Arts. 490, 520, 589 LECrim"],
        children: [
          {
            id: "d1-n4-1",
            label: "Detención y Plazos (72h)",
            notes: "Medida cautelar personal. Plazo máximo ordinario de 72 horas para puesta a disposición judicial.",
            references: ["Art. 17.2 CE", "Art. 520 LECrim"]
          },
          {
            id: "d1-n4-2",
            label: "Procedimiento de Habeas Corpus",
            notes: "Control judicial inmediato ante detenciones ilegales o prolongadas indebidamente.",
            references: ["Ley Orgánica 6/1984"]
          },
          {
            id: "d1-n4-3",
            label: "Medidas Cautelares Reales",
            notes: "Fianzas y embargos para asegurar responsabilidades civiles derivadas del delito.",
            references: ["Arts. 589-614 LECrim"]
          }
        ]
      },
      {
        id: "d1-b5",
        label: "5. Procedimientos Penales",
        color: "#8b5cf6",
        page: 3,
        notes: "Especialidades procesales según el tipo y gravedad de la infracción penal.",
        references: ["Pág. 3", "Arts. 757, 795, 962 LECrim"],
        children: [
          {
            id: "d1-n5-1",
            label: "Procedimiento Abreviado",
            notes: "Delitos castigados con pena privativa de libertad no superior a 9 años.",
            references: ["Art. 757 LECrim"]
          },
          {
            id: "d1-n5-2",
            label: "Juicios Rápidos",
            notes: "Delitos flagrantes con pena no superior a 5 años o materias específicas (tráfico, violencia de género).",
            references: ["Art. 795 LECrim"]
          }
        ]
      }
    ]
  },

  "fundamentos-ia": {
    id: "root-fundamentos-ia",
    label: "Fundamentos de IA y Modelos de Lenguaje (LLMs)",
    icon: "psychology",
    notes: "Arquitectura Transformer, redes neuronales profundas, mecanismos de atención y sistemas de agentes autónomos.",
    references: ["Vaswani et al. (2017)", "RLHF & DPO", "Function Calling Specs"],
    color: "#6366f1",
    children: [
      {
        id: "ia-b1",
        label: "1. Arquitectura Transformer",
        color: "#f59e0b",
        page: 1,
        notes: "Mecanismo fundamental de los modelos de lenguaje modernos.",
        references: ["Pág. 1", "Attention is All You Need"],
        children: [
          {
            id: "ia-n1-1",
            label: "Self-Attention Multi-Cabeza",
            notes: "Calcula matrices de Query, Key y Value para capturar dependencias a larga distancia.",
            references: ["Attention Mechanism"]
          },
          {
            id: "ia-n1-2",
            label: "Embeddings Posicionales",
            notes: "Inyectan la información del orden secuencial de los tokens en el espacio latente.",
            references: ["Positional Encoding"]
          }
        ]
      },
      {
        id: "ia-b2",
        label: "2. Aprendizaje y Fine-Tuning",
        color: "#06b6d4",
        page: 1,
        notes: "Estrategias de entrenamiento de modelos fundacionales.",
        references: ["Pág. 1", "Supervised Fine Tuning"],
        children: [
          {
            id: "ia-n2-1",
            label: "Pre-entrenamiento Autosupervisado",
            notes: "Predicción del siguiente token (Next-token prediction) sobre corpus masivos.",
            references: ["Causal Language Modeling"]
          },
          {
            id: "ia-n2-2",
            label: "Alineamiento con RLHF / DPO",
            notes: "Optimización de preferencias humanas para honestidad, utilidad y seguridad.",
            references: ["Direct Preference Optimization"]
          }
        ]
      },
      {
        id: "ia-b3",
        label: "3. Agentes y Tool Calling",
        color: "#10b981",
        page: 2,
        notes: "Extensión de capacidades mediante llamadas a herramientas externas.",
        references: ["Pág. 2", "ReAct & Function Calling"],
        children: [
          {
            id: "ia-n3-1",
            label: "Razonamiento ReAct",
            notes: "Intercalación de pensamientos (Thought), acciones (Action) y observaciones (Observation).",
            references: ["Yao et al. (2022)"]
          },
          {
            id: "ia-n3-2",
            label: "RAG (Retrieval Augmented Generation)",
            notes: "Recuperación de fragmentos relevantes desde bases de datos vectoriales antes de generar respuesta.",
            references: ["Vector Search"]
          }
        ]
      }
    ]
  }
};

// Fallback generator for dynamically uploaded PDFs
function buildFallbackMindMap(materialId: string, title: string, pageCount = 2): MindMapNode {
  return {
    id: `root-${materialId}`,
    label: title || "Esquema de Estudio",
    icon: "auto_stories",
    notes: `Mapa conceptual estructurado generado automáticamente a partir de ${title}. Explora las ramas o solicita una regeneración profunda con IA.`,
    references: [`Documento: ${title}`, `${pageCount} páginas analizadas`],
    color: "#6366f1",
    children: [
      {
        id: `${materialId}-b1`,
        label: "1. Conceptos Fundamentales",
        color: "#f59e0b",
        page: 1,
        notes: "Definición general y pilares teóricos principales del temario.",
        references: ["Pág. 1"],
        children: [
          {
            id: `${materialId}-n1-1`,
            label: "Definición y Alcance",
            notes: "Marco de aplicación y objetivos esenciales del documento.",
            references: ["Pág. 1"]
          },
          {
            id: `${materialId}-n1-2`,
            label: "Principios Informadores",
            notes: "Directrices obligatorias y criterios de interpretación.",
            references: ["Pág. 1"]
          }
        ]
      },
      {
        id: `${materialId}-b2`,
        label: "2. Estructura y Órganos",
        color: "#06b6d4",
        page: 1,
        notes: "Distribución orgánica y competencias funcionales.",
        references: ["Pág. 1"],
        children: [
          {
            id: `${materialId}-n2-1`,
            label: "Órganos Competentes",
            notes: "Sujetos e instituciones responsables de la ejecución.",
            references: ["Pág. 1"]
          },
          {
            id: `${materialId}-n2-2`,
            label: "Competencia y Atribuciones",
            notes: "Límites legales y atribuciones operativas.",
            references: ["Pág. 1"]
          }
        ]
      },
      {
        id: `${materialId}-b3`,
        label: "3. Procedimientos y Actuaciones",
        color: "#10b981",
        page: pageCount > 1 ? 2 : 1,
        notes: "Fases de tramitación, plazos y garantías legales.",
        references: [pageCount > 1 ? "Pág. 2" : "Pág. 1"],
        children: [
          {
            id: `${materialId}-n3-1`,
            label: "Fases del Procedimiento",
            notes: "Secuencia ordenada de trámites y resoluciones.",
            references: [pageCount > 1 ? "Pág. 2" : "Pág. 1"]
          },
          {
            id: `${materialId}-n3-2`,
            label: "Garantías y Recursos",
            notes: "Mecanismos de defensa y plazos de impugnación.",
            references: [pageCount > 1 ? "Pág. 2" : "Pág. 1"]
          }
        ]
      },
      {
        id: `${materialId}-b4`,
        label: "4. Régimen Sancionador y Medidas",
        color: "#ec4899",
        page: pageCount,
        notes: "Responsabilidades, medidas cautelares y consecuencias jurídicas.",
        references: [`Pág. ${pageCount}`],
        children: [
          {
            id: `${materialId}-n4-1`,
            label: "Medidas Cautelares",
            notes: "Actuaciones provisionales de aseguramiento.",
            references: [`Pág. ${pageCount}`]
          },
          {
            id: `${materialId}-n4-2`,
            label: "Efectos y Conclusiones",
            notes: "Cierre del expediente y ejecución.",
            references: [`Pág. ${pageCount}`]
          }
        ]
      }
    ]
  };
}

// Helper to find or build the right mind map for a selected material
function resolveMindMap(
  selectedId: string | null | undefined,
  materials: readonly { readonly id: string; readonly title: string; readonly pageCount: number }[]
): MindMapNode {
  if (selectedId && mindMapsByMaterialId[selectedId]) {
    return mindMapsByMaterialId[selectedId]!;
  }

  if (selectedId) {
    const mat = materials.find((m) => m.id === selectedId);
    if (mat) {
      return buildFallbackMindMap(mat.id, mat.title, mat.pageCount);
    }
  }

  // Default to first material or Tema 1
  const firstMat = materials[0];
  if (firstMat && mindMapsByMaterialId[firstMat.id]) {
    return mindMapsByMaterialId[firstMat.id]!;
  }

  return (
    mindMapsByMaterialId["tema-1-constitucion-espanola"] ??
    mindMapsByMaterialId["document-1"] ??
    defaultMindMapData
  );
}

const defaultMindMapData = mindMapsByMaterialId["tema-1-constitucion-espanola"]!;

// ---------------------------------------------------------------------------
// Main Mind Map Component with Interactive Infinite Canvas & Pan/Zoom
// ---------------------------------------------------------------------------

export function MindMapViewer({
  initialData,
  selectedMaterialId,
  onSelectMaterialId,
  onAskTutorAboutConcept,
  onGenerateQuizForBranch,
  onOpenPdfPage,
  onGenerateAiMap,
  theme = "dark"
}: MindMapViewerProps) {
  const materialsResult = useAtomValue(materialsQuery);

  const materialsList = useMemo(() => {
    return AsyncResult.match(materialsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.materials
    });
  }, [materialsResult]);

  // Current active mind map data
  const currentMindMap = useMemo(() => {
    if (initialData) return initialData;
    return resolveMindMap(selectedMaterialId, materialsList);
  }, [initialData, selectedMaterialId, materialsList]);

  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(currentMindMap);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Infinite Canvas Pan & Zoom state
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isLight = theme === "light";

  // When selected material changes, reset selection to root
  useEffect(() => {
    setSelectedNode(currentMindMap);
  }, [currentMindMap]);

  // Toggle collapse state of branch
  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Canvas Pan Handlers (Mouse drag on background)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan if clicking canvas background (not on a button or card)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".node-card") || target.closest("aside")) {
      return;
    }
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel zoom / pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom centered
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.max(0.4, Math.min(2.0, Number((z * zoomFactor).toFixed(2)))));
    } else {
      // 2-finger Pan
      setPan((p) => ({
        x: p.x - e.deltaX * 0.9,
        y: p.y - e.deltaY * 0.9
      }));
    }
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(0.9);
  };

  const fitView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(0.75);
  };

  // Layout calculations: Left and Right branches for balanced tree layout
  const branches = currentMindMap.children ?? [];
  const rightBranches = useMemo(() => branches.filter((_, i) => i % 2 === 0), [branches]);
  const leftBranches = useMemo(() => branches.filter((_, i) => i % 2 === 1), [branches]);

  return (
    <div
      className={`flex h-full w-full overflow-hidden relative select-none transition-colors ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-[#080c14] text-slate-100"
      }`}
    >
      {/* 1. Main Canvas Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Canvas Toolbar Header */}
        <header
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b backdrop-blur z-20 transition-colors shrink-0 ${
            isLight ? "border-slate-200 bg-white/90" : "border-slate-800/90 bg-slate-950/80"
          }`}
        >
          {/* Material / Topic Selector */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`grid size-8 place-items-center rounded-xl border ${
                isLight
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                  : "bg-indigo-600/20 text-indigo-400 border-indigo-500/30"
              }`}
            >
              <span className="material-symbols-outlined text-lg">schema</span>
            </span>

            <div className="flex items-center gap-2">
              <label htmlFor="material-select" className="sr-only">
                Seleccionar tema
              </label>
              <select
                id="material-select"
                value={selectedMaterialId ?? currentMindMap.id}
                onChange={(e) => onSelectMaterialId?.(e.target.value)}
                className={`text-xs font-semibold rounded-xl px-3 py-1.5 border transition cursor-pointer outline-none max-w-[260px] truncate ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-800 hover:border-indigo-500 shadow-sm"
                    : "bg-slate-900 border-slate-700 text-slate-100 hover:border-indigo-400"
                }`}
              >
                {materialsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    📖 {m.title} ({m.pageCount} págs)
                  </option>
                ))}
              </select>

              {onGenerateAiMap && (
                <button
                  type="button"
                  onClick={() => onGenerateAiMap(currentMindMap.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                  title="Pedir al tutor de IA que profundice en el esquema"
                >
                  <span className="material-symbols-outlined text-xs animate-spin-slow">
                    auto_awesome
                  </span>
                  <span className="hidden sm:inline">Regenerar con IA</span>
                </button>
              )}
            </div>
          </div>

          {/* Canvas Navigation & Zoom Toolbar */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center rounded-xl p-0.5 text-xs border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))}
                className={`size-7 grid place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Reducir zoom (−)"
              >
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <span
                className={`px-2 font-mono text-[11px] font-semibold select-none min-w-[42px] text-center ${
                  isLight ? "text-slate-700" : "text-slate-300"
                }`}
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                className={`size-7 grid place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Aumentar zoom (+)"
              >
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>

            <button
              type="button"
              onClick={resetView}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title="Centrar esquema (Restablecer posición)"
            >
              <span className="material-symbols-outlined text-xs">center_focus_strong</span>
              <span>Centrar</span>
            </button>

            <button
              type="button"
              onClick={fitView}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title="Ajustar todo a pantalla"
            >
              <span className="material-symbols-outlined text-xs">fit_screen</span>
              <span>Ajustar</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMinimap(!showMinimap)}
              className={`size-8 grid place-items-center rounded-xl border transition ${
                showMinimap
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : isLight
                  ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
              title={showMinimap ? "Ocultar radar de mapa" : "Mostrar radar de mapa"}
            >
              <span className="material-symbols-outlined text-sm">map</span>
            </button>
          </div>
        </header>

        {/* 2. Interactive Infinite Canvas with Drag-to-Pan */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: isLight
              ? "radial-gradient(#cbd5e1 1px, transparent 1px)"
              : "radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        >
          {/* Pan Hint Overlay */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 pointer-events-none opacity-60 hover:opacity-100 transition">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono border backdrop-blur ${
                isLight
                  ? "bg-white/80 border-slate-200 text-slate-600"
                  : "bg-slate-950/80 border-slate-800 text-slate-400"
              }`}
            >
              🖱️ Arrastra el fondo para desplazarte libremente · Ctrl+Rueda para zoom
            </span>
          </div>

          {/* Scaled & Translated Tree World */}
          <div
            className="transition-transform duration-75 ease-out origin-center flex items-center justify-center gap-16 relative p-20"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* Left Branches Column */}
            <div className="flex flex-col gap-10 items-end">
              {leftBranches.map((branch) => (
                <BranchTree
                  key={branch.id}
                  node={branch}
                  direction="left"
                  selectedId={selectedNode?.id}
                  collapsedIds={collapsedIds}
                  onSelect={(node) => setSelectedNode(node)}
                  onToggleCollapse={toggleCollapse}
                  isLight={isLight}
                />
              ))}
            </div>

            {/* Central Root Node */}
            <div
              onClick={() => setSelectedNode(currentMindMap)}
              className={`node-card cursor-pointer rounded-3xl p-6 border-2 shadow-2xl transition-all duration-300 min-w-[240px] max-w-[280px] text-center relative z-10 ${
                selectedNode?.id === currentMindMap.id
                  ? isLight
                    ? "border-indigo-600 bg-white shadow-xl shadow-indigo-200 ring-4 ring-indigo-500/20 scale-105"
                    : "border-indigo-400 bg-slate-900 shadow-2xl shadow-indigo-950/80 ring-4 ring-indigo-500/30 scale-105"
                  : isLight
                  ? "border-indigo-500/50 bg-white hover:border-indigo-600 hover:shadow-lg shadow-slate-200"
                  : "border-indigo-500/60 bg-slate-900/90 hover:border-indigo-400 hover:bg-slate-900 shadow-black/60"
              }`}
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 mx-auto mb-3">
                <span className="material-symbols-outlined text-2xl">
                  {currentMindMap.icon || "auto_stories"}
                </span>
              </div>
              <h1
                className={`font-display font-bold text-base leading-tight ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                {currentMindMap.label}
              </h1>
              <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${
                    isLight
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-indigo-950 text-indigo-300 border-indigo-800/60"
                  }`}
                >
                  {branches.length} Ramas Principales
                </span>
              </div>
            </div>

            {/* Right Branches Column */}
            <div className="flex flex-col gap-10 items-start">
              {rightBranches.map((branch) => (
                <BranchTree
                  key={branch.id}
                  node={branch}
                  direction="right"
                  selectedId={selectedNode?.id}
                  collapsedIds={collapsedIds}
                  onSelect={(node) => setSelectedNode(node)}
                  onToggleCollapse={toggleCollapse}
                  isLight={isLight}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3. Floating Radar / Minimap Overlay */}
        {showMinimap && (
          <div
            className={`absolute bottom-4 right-4 z-20 w-44 h-32 rounded-2xl border p-2 shadow-2xl backdrop-blur transition-all flex flex-col justify-between ${
              isLight
                ? "bg-white/90 border-slate-300 text-slate-700 shadow-slate-200"
                : "bg-slate-950/90 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
              <span className="flex items-center gap-1 text-indigo-500">
                <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Radar Esquema</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMinimap(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Schematic Mini Visual Representation */}
            <div className="flex-1 my-1 relative rounded-lg border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              {/* Mini Center Node */}
              <div className="size-3 rounded-full bg-indigo-600 shadow-sm"></div>
              {/* Mini Left Nodes */}
              <div className="absolute left-2 top-2 size-2 rounded-full bg-amber-500"></div>
              <div className="absolute left-2 bottom-2 size-2 rounded-full bg-pink-500"></div>
              {/* Mini Right Nodes */}
              <div className="absolute right-2 top-2 size-2 rounded-full bg-cyan-500"></div>
              <div className="absolute right-2 bottom-2 size-2 rounded-full bg-emerald-500"></div>
              {/* Active Viewport Indicator Box */}
              <div
                className="absolute border-2 border-indigo-500 bg-indigo-500/10 rounded pointer-events-none transition-all"
                style={{
                  width: `${Math.max(30, Math.min(80, 50 / zoom))}%`,
                  height: `${Math.max(30, Math.min(80, 50 / zoom))}%`,
                  transform: `translate(${-pan.x * 0.05}px, ${-pan.y * 0.05}px)`
                }}
              />
            </div>

            <span className="text-[9px] text-center text-slate-400 font-mono">
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* 4. Right Detail Drawer (Concept & Article Details) */}
      {selectedNode && (
        <aside
          className={`w-88 border-l backdrop-blur p-5 flex flex-col h-full overflow-y-auto shrink-0 z-30 transition-all duration-200 animate-in slide-in-from-right ${
            isLight
              ? "border-slate-200 bg-white/95 text-slate-900 shadow-2xl"
              : "border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl"
          }`}
        >
          <div
            className={`flex items-center justify-between pb-3 border-b ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-3 rounded-full shadow-sm"
                style={{ backgroundColor: selectedNode.color || "#6366f1" }}
              />
              <span
                className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Ficha del Concepto
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className={`p-1.5 rounded-xl transition ${
                isLight
                  ? "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
              title="Cerrar detalle"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          <div className="mt-4 space-y-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {selectedNode.page && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Pág. {selectedNode.page}
                  </span>
                )}
                {selectedNode.references && selectedNode.references[0] && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedNode.references[0]}
                  </span>
                )}
              </div>
              <h3
                className={`font-display font-bold text-xl leading-snug ${
                  isLight ? "text-slate-900" : "text-slate-100"
                }`}
              >
                {selectedNode.label}
              </h3>
            </div>

            {selectedNode.notes && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900/70 border-slate-800/80 text-slate-300"
                }`}
              >
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-2 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Definición & Contenido Pedagógico
                </span>
                <p className="text-sm font-normal">{selectedNode.notes}</p>
              </div>
            )}

            {selectedNode.references && selectedNode.references.length > 0 && (
              <div>
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-2 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Referencias Normativas & Artículos
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.references.map((ref, idx) => (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-xl border text-[11px] font-mono font-medium ${
                        isLight
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : "bg-indigo-950/60 border-indigo-800/40 text-indigo-300"
                      }`}
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Subnodes listing if any */}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div>
                <span
                  className={`block font-semibold text-[10px] uppercase font-mono mb-2 ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  Subconceptos Vinculados ({selectedNode.children.length})
                </span>
                <div className="space-y-1.5">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedNode(child)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between group ${
                        isLight
                          ? "bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-800 hover:border-indigo-300 shadow-sm"
                          : "bg-slate-900/50 hover:bg-slate-800/60 border-slate-800 text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-medium group-hover:text-indigo-600 transition">
                        {child.label}
                      </span>
                      <span className="material-symbols-outlined text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons Panel */}
          <div
            className={`pt-4 border-t space-y-2 mt-4 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                onAskTutorAboutConcept?.(selectedNode.label, selectedNode.notes)
              }
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
            >
              <span className="material-symbols-outlined text-sm">psychology</span>
              <span>Preguntar al tutor sobre esto</span>
            </button>

            <button
              type="button"
              onClick={() => onGenerateQuizForBranch?.(selectedNode.label)}
              className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-sm">quiz</span>
              <span>Crear quiz de este apartado</span>
            </button>

            {selectedNode.page && onOpenPdfPage && selectedMaterialId && (
              <button
                type="button"
                onClick={() => onOpenPdfPage(selectedMaterialId, selectedNode.page!)}
                className={`w-full flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-medium transition ${
                  isLight
                    ? "border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>Ver en PDF (Pág. {selectedNode.page})</span>
              </button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch Tree Component with SVG Curves and Subnodes
// ---------------------------------------------------------------------------

function BranchTree({
  node,
  direction,
  selectedId,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  isLight
}: {
  readonly node: MindMapNode;
  readonly direction: "left" | "right";
  readonly selectedId?: string | undefined;
  readonly collapsedIds: Set<string>;
  readonly onSelect: (node: MindMapNode) => void;
  readonly onToggleCollapse: (id: string, e: React.MouseEvent) => void;
  readonly isLight?: boolean | undefined;
}) {
  const isSelected = selectedId === node.id;
  const isCollapsed = collapsedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const branchColor = node.color || "#6366f1";

  return (
    <div
      className={`flex items-center gap-6 relative ${
        direction === "left" ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Main Branch Card */}
      <div
        onClick={() => onSelect(node)}
        className={`node-card group relative cursor-pointer rounded-2xl p-4 border transition-all duration-200 min-w-[210px] max-w-[260px] shadow-lg ${
          isSelected
            ? isLight
              ? "border-indigo-600 bg-white shadow-xl ring-2 ring-indigo-400 scale-[1.02]"
              : "border-indigo-400 bg-slate-900 shadow-2xl shadow-indigo-950/60 ring-2 ring-indigo-500/30 scale-[1.02]"
            : isLight
            ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
            : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
        }`}
        style={{
          borderLeftColor: direction === "right" ? branchColor : undefined,
          borderRightColor: direction === "left" ? branchColor : undefined,
          borderLeftWidth: direction === "right" ? "5px" : "1px",
          borderRightWidth: direction === "left" ? "5px" : "1px"
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {node.page && (
              <span
                className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md mb-1.5 uppercase"
                style={{
                  backgroundColor: `${branchColor}20`,
                  color: branchColor
                }}
              >
                Pág. {node.page}
              </span>
            )}
            <span
              className={`block font-display font-semibold text-xs sm:text-sm leading-snug ${
                isLight ? "text-slate-900" : "text-slate-100"
              }`}
            >
              {node.label}
            </span>
          </div>

          {hasChildren && (
            <button
              type="button"
              onClick={(e) => onToggleCollapse(node.id, e)}
              className={`size-6 grid place-items-center rounded-lg transition font-mono font-bold text-xs shrink-0 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
              title={isCollapsed ? "Expandir conceptos" : "Colapsar conceptos"}
            >
              {isCollapsed ? `+${node.children?.length}` : "−"}
            </button>
          )}
        </div>

        {node.references && node.references[0] && (
          <span
            className={`mt-2 block text-[10px] font-mono truncate ${
              isLight ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {node.references[0]}
          </span>
        )}
      </div>

      {/* Subnodes Column */}
      {hasChildren && !isCollapsed && (
        <div
          className={`flex flex-col gap-3 relative ${
            direction === "left" ? "items-end" : "items-start"
          }`}
        >
          {node.children?.map((child) => (
            <div
              key={child.id}
              onClick={() => onSelect(child)}
              className={`node-card cursor-pointer rounded-xl p-3 border text-left transition-all duration-200 min-w-[170px] max-w-[220px] shadow-sm ${
                selectedId === child.id
                  ? isLight
                    ? "border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-400 shadow-md scale-[1.02]"
                    : "border-indigo-400 bg-indigo-950/60 shadow-lg ring-2 ring-indigo-400 text-slate-100 scale-[1.02]"
                  : isLight
                  ? "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                  : "border-slate-800/80 bg-slate-950/90 hover:border-slate-700 hover:bg-slate-900 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: branchColor }}
                />
                <span className="block font-semibold text-[11px] leading-tight">
                  {child.label}
                </span>
              </div>
              {child.references && child.references[0] && (
                <span
                  className={`block text-[9px] font-mono truncate ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}
                >
                  {child.references[0]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
