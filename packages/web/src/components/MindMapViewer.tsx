import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { NoteArtifact } from "@proxus/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artifactQuery, artifactsQuery } from "../domain/artifacts/atoms.ts";
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
// Deep Multi-Level Dendritic Mind Maps Knowledge Base (MindMapWizard Style)
// ---------------------------------------------------------------------------

const mindMapsByMaterialId: Record<string, MindMapNode> = {
  "document-1": {
    id: "root-lecrim",
    label: "Derecho Procesal Penal y LECrim",
    icon: "gavel",
    notes: "Marco normativo general del proceso penal español regulado por la Ley de Enjuiciamiento Criminal y la Constitución Española.",
    references: ["Art. 24 CE", "Arts. 1, 2 y 14 LECrim", "LO 6/1984"],
    color: "#06b6d4",
    children: [
      {
        id: "d1-b1",
        label: "El Proceso Penal y sus Principios Informadores",
        color: "#f59e0b",
        page: 1,
        notes: "Instrumento exclusivo del Estado para la aplicación del ius puniendi tras la comisión de un delito.",
        references: ["Pág. 1", "Arts. 1 y 2 LECrim"],
        children: [
          {
            id: "d1-b1-s1",
            label: "Concepto y Función",
            notes: "Instrumento exclusivo del Estado para la aplicación del ius puniendi tras la comisión de un hecho delictivo.",
            references: ["Pág. 1", "Art. 1 LECrim"],
            children: [
              {
                id: "d1-b1-s1-1",
                label: "Ius Puniendi Estatal",
                notes: "Monopolio de la potestad punitiva y sancionadora en manos exclusivas de los tribunales.",
                references: ["Art. 1 LECrim"]
              }
            ]
          },
          {
            id: "d1-b1-s2",
            label: "Principios del Proceso Penal",
            notes: "Garantías constitucionales y procesales que rigen la persecución penal.",
            references: ["Art. 24.2 CE"],
            children: [
              {
                id: "d1-b1-s2-1",
                label: "Necesidad y Legalidad Procesal",
                notes: "Indispensabilidad del proceso previo para imponer cualquier pena.",
                references: ["Arts. 1 y 2 LECrim"]
              },
              {
                id: "d1-b1-s2-2",
                label: "Juez Predeterminado por la Ley",
                notes: "Garantía de jurisdicción ordinaria establecida previamente en la ley.",
                references: ["Art. 24.2 CE"]
              },
              {
                id: "d1-b1-s2-3",
                label: "Principio Acusatorio",
                notes: "Separación de instrucción y juzgamiento, congruencia y prohibición de reformatio in peius.",
                references: ["Art. 24.2 CE"]
              },
              {
                id: "d1-b1-s2-4",
                label: "Presunción de Inocencia",
                notes: "Regla de juicio y tratamiento que exige prueba de cargo válida.",
                references: ["Art. 24.2 CE"]
              },
              {
                id: "d1-b1-s2-5",
                label: "Principios del Procedimiento",
                notes: "Oralidad, publicidad, concentración, inmediación y contradicción.",
                references: ["Art. 120 CE"]
              }
            ]
          },
          {
            id: "d1-b1-s3",
            label: "Estructura General del Proceso Penal",
            notes: "Fases secuenciales de la tramitación de una causa criminal.",
            references: ["Págs. 1 y 2 LECrim"],
            children: [
              {
                id: "d1-b1-s3-1",
                label: "Fase de Instrucción (Sumarial)",
                notes: "Fase preparatoria de investigación y aseguramiento de responsabilidades.",
                references: ["Art. 299 LECrim"]
              },
              {
                id: "d1-b1-s3-2",
                label: "Fase Intermedia",
                notes: "Decisión sobre la apertura del juicio oral o sobreseimiento de la causa.",
                references: ["Arts. 622 y 779 LECrim"]
              },
              {
                id: "d1-b1-s3-3",
                label: "Fase de Juicio Oral y Sentencia",
                notes: "Práctica de la prueba en audiencia pública, debate contradictorio y fallo.",
                references: ["Arts. 688 y 786 LECrim"]
              },
              {
                id: "d1-b1-s3-4",
                label: "Fase de Ejecución",
                notes: "Cumplimiento forzoso de penas, medidas de seguridad y responsabilidad civil.",
                references: ["Art. 983 LECrim"]
              }
            ]
          }
        ]
      },
      {
        id: "d1-b2",
        label: "Jurisdicción y Competencia en el Orden Penal",
        color: "#06b6d4",
        page: 1,
        notes: "Criterios normativos para determinar qué tribunal juzga cada causa penal.",
        references: ["Págs. 1 y 2", "Arts. 14 a 18 LECrim"],
        children: [
          {
            id: "d1-b2-s1",
            label: "Jurisdicción Ordinaria Penal",
            notes: "Extensión y límites territoriales e institucionales conforme a la LOPJ.",
            references: ["Art. 9.3 LOPJ"]
          },
          {
            id: "d1-b2-s2",
            label: "Criterios de Determinación de la Competencia",
            notes: "Reglas para atribuir el conocimiento del asunto a un órgano judicial concreto.",
            references: ["Arts. 14 a 18 LECrim"],
            children: [
              {
                id: "d1-b2-s2-1",
                label: "Competencia Objetiva (Órganos Judiciales)",
                notes: "Distribución por razón de la materia, gravedad de la pena o aforamientos.",
                references: ["Art. 14 LECrim"],
                children: [
                  {
                    id: "d1-b2-s2-1a",
                    label: "Juzgados de Instrucción",
                    notes: "Instrucción de causas por delito y enjuiciamiento de delitos leves.",
                    references: ["Art. 14.1 LECrim"]
                  },
                  {
                    id: "d1-b2-s2-1b",
                    label: "Juzgados de lo Penal",
                    notes: "Delitos con pena de prisión no superior a 5 años o multa sin límite.",
                    references: ["Art. 14.3 LECrim"]
                  },
                  {
                    id: "d1-b2-s2-1c",
                    label: "Audiencias Provinciales",
                    notes: "Delitos graves con pena de prisión superior a 5 años.",
                    references: ["Art. 14.4 LECrim"]
                  },
                  {
                    id: "d1-b2-s2-1d",
                    label: "Tribunal del Jurado",
                    notes: "Homicidio, amenazas, omisión del deber de socorro y delitos de funcionarios.",
                    references: ["LOTJ 5/1995"]
                  },
                  {
                    id: "d1-b2-s2-1e",
                    label: "Audiencia Nacional",
                    notes: "Terrorismo, narcotráfico en bandas organizadas y delitos contra la Corona.",
                    references: ["Art. 65 LOPJ"]
                  }
                ]
              },
              {
                id: "d1-b2-s2-2",
                label: "Competencia Funcional",
                notes: "Órganos encargados de incidencias, recursos de apelación y casación.",
                references: ["Art. 14 LECrim"]
              },
              {
                id: "d1-b2-s2-3",
                label: "Competencia Territorial (Arts. 14-18)",
                notes: "Forum commissi delicti (lugar de comisión) y fueros subsidiarios.",
                references: ["Arts. 14 y 15 LECrim"],
                children: [
                  {
                    id: "d1-b2-s2-3a",
                    label: "Regla General: Forum Delicti",
                    notes: "Lugar exacto donde se haya cometido el hecho delictivo.",
                    references: ["Art. 14 LECrim"]
                  },
                  {
                    id: "d1-b2-s2-3b",
                    label: "Fueros Subsidiarios (Art. 15)",
                    notes: "Lugar de descubrimiento de pruebas, aprehensión o residencia del investigado.",
                    references: ["Art. 15 LECrim"]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "d1-b3",
        label: "Las Partes en el Proceso Penal",
        color: "#ec4899",
        page: 2,
        notes: "Sujetos procesales activos y pasivos que intervienen en la causa criminal.",
        references: ["Pág. 2", "Arts. 100 a 118 LECrim"],
        children: [
          {
            id: "d1-b3-s1",
            label: "Partes Acusadoras",
            notes: "Titulares de la acción penal que ejercitan la pretensión acusatoria.",
            references: ["Arts. 100-110 LECrim"],
            children: [
              {
                id: "d1-b3-s1-1",
                label: "Ministerio Fiscal",
                notes: "Promotor de la acción de la justicia y defensor de la legalidad de oficio.",
                references: ["Art. 124 CE", "EOMF"]
              },
              {
                id: "d1-b3-s1-2",
                label: "Acusación Particular",
                notes: "Ofendido o víctima directa del delito (personación mediante querella o comparecencia).",
                references: ["Arts. 109 y 110 LECrim"]
              },
              {
                id: "d1-b3-s1-3",
                label: "Acusación Popular",
                notes: "Ciudadanos españoles no perjudicados directamente, en defensa del interés general.",
                references: ["Art. 125 CE", "Art. 101 LECrim"]
              },
              {
                id: "d1-b3-s1-4",
                label: "Acusación Privada",
                notes: "Exclusiva en delitos perseguibles a instancia de parte (injurias y calumnias).",
                references: ["Arts. 104 y 215 CP"]
              },
              {
                id: "d1-b3-s1-5",
                label: "Actor Civil",
                notes: "Ejercita únicamente la acción civil para restitución, reparación o indemnización.",
                references: ["Arts. 100 y 112 LECrim"]
              }
            ]
          },
          {
            id: "d1-b3-s2",
            label: "Partes Acusadas",
            notes: "Sujetos pasivos contra quienes se dirige la imputación penal y civil.",
            references: ["Arts. 118 y 520 LECrim"],
            children: [
              {
                id: "d1-b3-s2-1",
                label: "Investigado y Encausado",
                notes: "Persona a quien se imputa un hecho delictivo con plenos derechos de defensa.",
                references: ["Art. 118 LECrim"],
                children: [
                  {
                    id: "d1-b3-s2-1a",
                    label: "Derecho de Defensa Técnica",
                    notes: "Asistencia letrada obligatoria desde la detención o citación.",
                    references: ["Art. 118.1.a LECrim"]
                  },
                  {
                    id: "d1-b3-s2-1b",
                    label: "Derecho a Guardar Silencio",
                    notes: "No declarar contra sí mismo ni confesarse culpable.",
                    references: ["Art. 24.2 CE", "Art. 520 LECrim"]
                  }
                ]
              },
              {
                id: "d1-b3-s2-2",
                label: "Responsable Civil Directo o Subsidiario",
                notes: "Personas físicas o jurídicas que responden del resarcimiento económico.",
                references: ["Arts. 116 a 122 Código Penal"]
              }
            ]
          }
        ]
      },
      {
        id: "d1-b4",
        label: "La Policía Judicial y Órganos de Investigación",
        color: "#8b5cf6",
        page: 3,
        notes: "Funciones y atribuciones de auxilio a la autoridad judicial y fiscal.",
        references: ["Pág. 3", "Arts. 282 a 298 LECrim", "LO 2/1986"],
        children: [
          {
            id: "d1-b4-s1",
            label: "Concepto y Marco Normativo",
            notes: "Auxilio a los tribunales y Ministerio Fiscal en la averiguación del delito.",
            references: ["Art. 126 CE", "RD 769/1987"]
          },
          {
            id: "d1-b4-s2",
            label: "Composición y Doble Dependencia",
            notes: "Dependencia funcional de Jueces y Fiscales; dependencia orgánica del Ministerio del Interior.",
            references: ["Art. 29 LO 2/1986"],
            children: [
              {
                id: "d1-b4-s2-1",
                label: "Dependencia Funcional",
                notes: "Exclusiva de Jueces, Tribunales y Fiscales en actuaciones investigadoras.",
                references: ["Art. 126 CE"]
              },
              {
                id: "d1-b4-s2-2",
                label: "Dependencia Orgánica",
                notes: "Ministerio del Interior (Guardia Civil y Cuerpo Nacional de Policía).",
                references: ["LO 2/1986"]
              }
            ]
          },
          {
            id: "d1-b4-s3",
            label: "Medidas Cautelares Personales y Reales",
            notes: "Privación cautelar de libertad y aseguramiento del patrimonio.",
            references: ["Arts. 489 a 614 LECrim"],
            children: [
              {
                id: "d1-b4-s3-1",
                label: "Detención y Plazos (72h)",
                notes: "Puesta a disposición judicial en el plazo estrictamente necesario (máximo 72h).",
                references: ["Art. 17.2 CE", "Art. 520 LECrim"]
              },
              {
                id: "d1-b4-s3-2",
                label: "Procedimiento de Habeas Corpus",
                notes: "Puesta inmediata ante el Juez de Instrucción ante detenciones ilegales.",
                references: ["LO 6/1984"]
              },
              {
                id: "d1-b4-s3-3",
                label: "Fianzas y Embargos",
                notes: "Garantía de responsabilidades pecuniarias y costas procesales.",
                references: ["Arts. 589 a 614 LECrim"]
              }
            ]
          }
        ]
      }
    ]
  },

  "tema-1-constitucion-espanola": {
    id: "root-tema-1",
    label: "Tema 1: Constitución Española de 1978",
    icon: "menu_book",
    notes: "Norma suprema del ordenamiento jurídico español. Título Preliminar, valores superiores y catálogo de Derechos Fundamentales y Libertades Públicas.",
    references: ["Art. 1 CE", "Arts. 14 a 29 CE", "Art. 53 CE", "Art. 55 CE", "Art. 116 CE"],
    color: "#f59e0b",
    children: [
      {
        id: "t1-b1",
        label: "Estructura y Principios del Título Preliminar",
        color: "#f59e0b",
        page: 1,
        notes: "Principios constitucionales básicos, forma política del Estado y soberanía.",
        references: ["Pág. 1", "Arts. 1 a 9 CE"],
        children: [
          {
            id: "t1-b1-s1",
            label: "Valores Superiores del Ordenamiento (Art. 1.1)",
            notes: "Libertad, justicia, igualdad y pluralismo político en un Estado social y democrático de Derecho.",
            references: ["Art. 1.1 CE"]
          },
          {
            id: "t1-b1-s2",
            label: "Soberanía Nacional y Monarquía Parlamentaria",
            notes: "La soberanía reside en el pueblo español (Art. 1.2). Forma política: Monarquía parlamentaria (Art. 1.3).",
            references: ["Arts. 1.2 y 1.3 CE"]
          },
          {
            id: "t1-b1-s3",
            label: "Fuerzas Armadas (Artículo 8)",
            notes: "Ejército de Tierra, Armada y Ejército del Aire: Garantizar soberanía e integridad territorial.",
            references: ["Art. 8 CE"]
          }
        ]
      },
      {
        id: "t1-b2",
        label: "Derechos Fundamentales de Máxima Protección (Arts. 14-29)",
        color: "#06b6d4",
        page: 1,
        notes: "Sección 1ª del Capítulo II del Título I. Tutelables en amparo ante el Tribunal Constitucional.",
        references: ["Pág. 1", "Arts. 14 a 29 CE", "Art. 53.2 CE"],
        children: [
          {
            id: "t1-b2-s1",
            label: "Igualdad ante la Ley (Art. 14)",
            notes: "Prohibición de discriminación por nacimiento, raza, sexo, religión u opinión.",
            references: ["Art. 14 CE"]
          },
          {
            id: "t1-b2-s2",
            label: "Vida e Integridad Física y Moral (Art. 15)",
            notes: "Abolición total de la pena de muerte y prohibición de torturas.",
            references: ["Art. 15 CE"]
          },
          {
            id: "t1-b2-s3",
            label: "Libertad y Seguridad: Detención Máxima 72h (Art. 17)",
            notes: "Plazo de 72 horas para puesta judicial o libertad y garantía de Habeas Corpus.",
            references: ["Art. 17 CE", "LO 6/1984"]
          },
          {
            id: "t1-b2-s4",
            label: "Inviolabilidad del Domicilio y Secreto (Art. 18)",
            notes: "Consentimiento del titular, resolución judicial motivada o flagrante delito.",
            references: ["Art. 18.2 y 18.3 CE"]
          },
          {
            id: "t1-b2-s5",
            label: "Tutela Judicial Efectiva (Art. 24)",
            notes: "Acceso a la justicia, defensa letrada, no autoincriminación y presunción de inocencia.",
            references: ["Art. 24 CE"]
          }
        ]
      },
      {
        id: "t1-b3",
        label: "Garantías y Amparo Constitucional (Arts. 53 y 54)",
        color: "#ec4899",
        page: 2,
        notes: "Sistema de protección de los derechos reconocidos en la Carta Magna.",
        references: ["Pág. 2", "Arts. 53 y 54 CE"],
        children: [
          {
            id: "t1-b3-s1",
            label: "Recurso de Amparo Constitucional (Art. 53.2)",
            notes: "Vía directa ante el Tribunal Constitucional para Arts. 14 a 29 y 30.2.",
            references: ["Art. 53.2 CE", "LOTC 2/1979"]
          },
          {
            id: "t1-b3-s2",
            label: "Procedimiento Preferente y Sumario",
            notes: "Mecanismo extraordinariamente rápido ante juzgados ordinarios.",
            references: ["Art. 53.2 CE"]
          },
          {
            id: "t1-b3-s3",
            label: "El Defensor del Pueblo (Art. 54)",
            notes: "Alto comisionado de las Cortes Generales para la supervisión de la Administración.",
            references: ["Art. 54 CE", "LO 3/1981"]
          }
        ]
      },
      {
        id: "t1-b4",
        label: "Suspensión de Derechos y Estados Excepcionales (Art. 116)",
        color: "#8b5cf6",
        page: 2,
        notes: "Régimen constitucional de los estados de alarma, excepción y sitio.",
        references: ["Pág. 2", "Arts. 55 y 116 CE"],
        children: [
          {
            id: "t1-b4-s1",
            label: "Derechos Suspensibles (Art. 55.1)",
            notes: "Libertad personal (17), domicilio (18.2), comunicaciones (18.3), huelga (28.2).",
            references: ["Art. 55.1 CE"]
          },
          {
            id: "t1-b4-s2",
            label: "Estado de Alarma (Gobierno)",
            notes: "Catástrofes y crisis sanitarias; decretado por Consejo de Ministros (15 días).",
            references: ["Art. 116.2 CE", "LO 4/1981"]
          },
          {
            id: "t1-b4-s3",
            label: "Estados de Excepción y Sitio (Cortes)",
            notes: "Grave alteración del orden público o amenaza a la soberanía nacional.",
            references: ["Art. 116.3 y 116.4 CE"]
          }
        ]
      }
    ]
  },

  "tema-4-organizacion-territorial": {
    id: "root-tema-4",
    label: "Tema 4: Organización Territorial del Estado",
    icon: "domain",
    notes: "Organización en municipios, provincias y CCAA (Título VIII CE). Principios de autonomía, solidaridad y reparto competencial.",
    references: ["Arts. 137 a 158 CE", "Art. 149.1 CE"],
    color: "#10b981",
    children: [
      {
        id: "t4-b1",
        label: "Principios del Título VIII (Arts. 137-139)",
        color: "#f59e0b",
        page: 1,
        notes: "Bases de la descentralización y cohesión territorial del Estado.",
        references: ["Pág. 1", "Arts. 137 a 139 CE"],
        children: [
          {
            id: "t4-b1-s1",
            label: "Autonomía Territorial (Art. 137)",
            notes: "Municipios, provincias y CCAA gozan de autonomía para la gestión de sus intereses.",
            references: ["Art. 137 CE"]
          },
          {
            id: "t4-b1-s2",
            label: "Principio de Solidaridad (Art. 138)",
            notes: "Garantía de equilibrio económico justo sin privilegios estatutarios.",
            references: ["Art. 138 CE"]
          },
          {
            id: "t4-b1-s3",
            label: "Igualdad y Libertad de Circulación (Art. 139)",
            notes: "Mismos derechos en todo el territorio; prohibición de barreras al comercio.",
            references: ["Art. 139 CE"]
          }
        ]
      },
      {
        id: "t4-b2",
        label: "Administración Local: Municipios y Provincias",
        color: "#06b6d4",
        page: 1,
        notes: "Entidades locales institucionales con personalidad jurídica propia.",
        references: ["Pág. 1", "Arts. 140 a 142 CE"],
        children: [
          {
            id: "t4-b2-s1",
            label: "El Municipio y el Ayuntamiento (Art. 140)",
            notes: "Entidad básica local; gobierno por Alcalde y Concejales elegidos democráticamente.",
            references: ["Art. 140 CE", "LBRL 7/1985"]
          },
          {
            id: "t4-b2-s2",
            label: "La Provincia y Diputaciones (Art. 141)",
            notes: "Agrupación de municipios y división territorial del Estado; gobierno por Diputaciones.",
            references: ["Art. 141 CE"]
          },
          {
            id: "t4-b2-s3",
            label: "Haciendas Locales (Art. 142)",
            notes: "Suficiencia de recursos financieros tributarios y transferencias estatales.",
            references: ["Art. 142 CE"]
          }
        ]
      },
      {
        id: "t4-b3",
        label: "Comunidades Autónomas y Estatutos (Arts. 143-151)",
        color: "#ec4899",
        page: 2,
        notes: "Vías de acceso y régimen estatutario de las nacionalidades y regiones.",
        references: ["Pág. 2", "Arts. 143, 147 y 151 CE"],
        children: [
          {
            id: "t4-b3-s1",
            label: "Vía Ordinaria vs Vía Rápida",
            notes: "Vía lenta del Art. 143 frente a la vía especial y cualificada del Art. 151.",
            references: ["Arts. 143 y 151 CE"]
          },
          {
            id: "t4-b3-s2",
            label: "Estatuto de Autonomía (Art. 147)",
            notes: "Norma institucional básica amparada por el Estado mediante Ley Orgánica.",
            references: ["Art. 147 CE"]
          }
        ]
      },
      {
        id: "t4-b4",
        label: "Competencias Exclusivas del Estado (Art. 149.1)",
        color: "#8b5cf6",
        page: 2,
        notes: "Materias reservadas en exclusiva a los poderes centrales del Estado.",
        references: ["Pág. 2", "Artículo 149.1 CE"],
        children: [
          {
            id: "t4-b4-s1",
            label: "Seguridad Pública (149.1.29ª)",
            notes: "Competencia exclusiva estatal, sin perjuicio de policías de las CCAA.",
            references: ["Art. 149.1.29ª CE"]
          },
          {
            id: "t4-b4-s2",
            label: "Defensa, Fuerzas Armadas y Justicia",
            notes: "Administración de justicia, relaciones internacionales y legislación penal.",
            references: ["Art. 149.1.4ª, 5ª y 6ª CE"]
          }
        ]
      }
    ]
  },

  "tema-9-ley-organica-fuerzas-seguridad": {
    id: "root-tema-9",
    label: "Tema 9: LO 2/1986 de Fuerzas y Cuerpos de Seguridad",
    icon: "shield",
    notes: "Régimen estatutario, principios deontológicos y competencias exclusivas de la Guardia Civil y Policía Nacional.",
    references: ["LO 2/1986", "Art. 5 (Principios)", "Art. 9 (Naturaleza)", "Art. 12 (Competencias)"],
    color: "#10b981",
    children: [
      {
        id: "t9-b1",
        label: "Principios Básicos de Actuación (Artículo 5)",
        color: "#f59e0b",
        page: 1,
        notes: "Código ético y directrices operativas de intervención policial.",
        references: ["Pág. 1", "Artículo 5 LO 2/1986"],
        children: [
          {
            id: "t9-b1-s1",
            label: "Adecuación al Ordenamiento Jurídico",
            notes: "Respeto riguroso a la Constitución, neutralidad política e imparcialidad.",
            references: ["Art. 5.1 LO 2/1986"]
          },
          {
            id: "t9-b1-s2",
            label: "Uso Proporcional de Armas de Fuego",
            notes: "Principios de congruencia, oportunidad y proporcionalidad estricta.",
            references: ["Art. 5.2.c LO 2/1986"]
          },
          {
            id: "t9-b1-s3",
            label: "Dedicación Profesional Continua",
            notes: "Obligación de intervenir siempre, en cualquier momento, de servicio o no.",
            references: ["Art. 5.4 LO 2/1986"]
          }
        ]
      },
      {
        id: "t9-b2",
        label: "Naturaleza y Estructura de la Guardia Civil",
        color: "#06b6d4",
        page: 1,
        notes: "Instituto armado de naturaleza militar con doble dependencia ministerial.",
        references: ["Pág. 1", "Capítulo II LO 2/1986"],
        children: [
          {
            id: "t9-b2-s1",
            label: "Instituto Armado de Naturaleza Militar",
            notes: "Cuerpo de seguridad del Estado militarmente organizado con disciplina interna.",
            references: ["Art. 9 LO 2/1986"]
          },
          {
            id: "t9-b2-s2",
            label: "Doble Dependencia Ministerial",
            notes: "Ministerio del Interior (seguridad ciudadana) y Ministerio de Defensa (misiones militares).",
            references: ["Art. 9.1 LO 2/1986"]
          },
          {
            id: "t9-b2-s3",
            label: "Ámbito Territorial Preferente",
            notes: "Medio rural, mar territorial, costas y vías interurbanas de comunicación.",
            references: ["Art. 11.2 LO 2/1986"]
          }
        ]
      },
      {
        id: "t9-b3",
        label: "Competencias Exclusivas de la Guardia Civil",
        color: "#ec4899",
        page: 2,
        notes: "Funciones encomendadas por ley en exclusiva a la Guardia Civil en todo el territorio.",
        references: ["Pág. 2", "Artículo 12.1.b LO 2/1986"],
        children: [
          {
            id: "t9-b3-s1",
            label: "Armas y Explosivos (Intervención)",
            notes: "Control del régimen de fabricación, tenencia, circulación y comercio.",
            references: ["Art. 12.1.b.1ª"]
          },
          {
            id: "t9-b3-s2",
            label: "Resguardo Fiscal y Contrabando",
            notes: "Persecución de delitos e infracciones fiscales y aduaneras en fronteras.",
            references: ["Art. 12.1.b.2ª"]
          },
          {
            id: "t9-b3-s3",
            label: "Tráfico Interurbano (Agrupación)",
            notes: "Vigilancia, control de transportes y auxilio vial en carreteras.",
            references: ["Art. 12.1.b.3ª"]
          },
          {
            id: "t9-b3-s4",
            label: "Medio Ambiente y Montes (SEPRONA)",
            notes: "Conservación de la naturaleza, espacios protegidos, aguas y fauna.",
            references: ["Art. 12.1.b.5ª"]
          }
        ]
      },
      {
        id: "t9-b4",
        label: "Policía Judicial y Coordinación Operativa",
        color: "#8b5cf6",
        page: 2,
        notes: "Estructura de averiguación criminal y órganos de coordinación policial.",
        references: ["Pág. 2", "Arts. 29 a 36 LO 2/1986"],
        children: [
          {
            id: "t9-b4-s1",
            label: "Unidades Orgánicas de PJ (UOPJ)",
            notes: "Dependencia funcional exclusiva de Jueces, Tribunales y Fiscales.",
            references: ["Art. 29 LO 2/1986", "Art. 126 CE"]
          },
          {
            id: "t9-b4-s2",
            label: "Juntas Locales de Seguridad",
            notes: "Coordinación con Policía Nacional y Cuerpos de Policía Local.",
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
    notes: "Concepto dogmático de delito, formas de culpabilidad, causas de justificación y clasificación de las penas.",
    references: ["Código Penal (LO 10/1995)", "Arts. 1, 10, 19, 20, 21, 22 y 33 CP"],
    color: "#8b5cf6",
    children: [
      {
        id: "t14-b1",
        label: "Concepto de Delito y Culpabilidad (Art. 10 CP)",
        color: "#f59e0b",
        page: 1,
        notes: "Definición legal de delito, principio de legalidad penal y dolo/imprudencia.",
        references: ["Pág. 1", "Arts. 1, 10 y 12 CP"],
        children: [
          {
            id: "t14-b1-s1",
            label: "Definición Legal de Delito",
            notes: "Acciones y omisiones dolosas o imprudentes penadas por la ley.",
            references: ["Art. 10 CP"]
          },
          {
            id: "t14-b1-s2",
            label: "Principio de Legalidad Penal",
            notes: "Nullum crimen, nulla poena sine lege previa, scripta et stricta.",
            references: ["Art. 1 CP", "Art. 25.1 CE"]
          },
          {
            id: "t14-b1-s3",
            label: "Dolo e Imprudencia (Art. 12 CP)",
            notes: "Dolo: conciencia y voluntad. Imprudencia grave/menos grave solo típica si está tipificada.",
            references: ["Art. 12 CP"]
          }
        ]
      },
      {
        id: "t14-b2",
        label: "Causas de Exención de Responsabilidad (Arts. 19-20)",
        color: "#06b6d4",
        page: 1,
        notes: "Causas de justificación que excluyen la antijuridicidad e inimputabilidad.",
        references: ["Pág. 1", "Artículos 19 y 20 Código Penal"],
        children: [
          {
            id: "t14-b2-s1",
            label: "Minoría de Edad Penal (<18 años)",
            notes: "Menores de 18 años exentos de CP ordinario; aplicación de la LORPM 5/2000.",
            references: ["Art. 19 CP", "LORPM 5/2000"]
          },
          {
            id: "t14-b2-s2",
            label: "Legítima Defensa (Art. 20.4 CP)",
            notes: "Agresión ilegítima, necesidad racional del medio y falta de provocación suficiente.",
            references: ["Art. 20.4 CP"]
          },
          {
            id: "t14-b2-s3",
            label: "Estado de Necesidad (Art. 20.5 CP)",
            notes: "Evitar un mal propio o ajeno causando otro menor, sin deber de sacrificio.",
            references: ["Art. 20.5 CP"]
          },
          {
            id: "t14-b2-s4",
            label: "Cumplimiento del Deber (Art. 20.7 CP)",
            notes: "Obrar en cumplimiento de un deber o en ejercicio legítimo de un oficio o cargo.",
            references: ["Art. 20.7 CP"]
          }
        ]
      },
      {
        id: "t14-b3",
        label: "Circunstancias Modificativas: Atenuantes y Agravantes",
        color: "#ec4899",
        page: 2,
        notes: "Factores accidentales que modifican la intensidad de la pena aplicable.",
        references: ["Pág. 2", "Artículos 21 y 22 CP"],
        children: [
          {
            id: "t14-b3-s1",
            label: "Atenuantes (Art. 21 CP)",
            notes: "Confesión previa a la causa, reparación del daño y dilaciones indebidas.",
            references: ["Art. 21 CP"]
          },
          {
            id: "t14-b3-s2",
            label: "Alevosía (Art. 22.1ª CP)",
            notes: "Empleo de medios que aseguran la ejecución sin riesgo procedente de la defensa.",
            references: ["Art. 22.1ª CP"]
          },
          {
            id: "t14-b3-s3",
            label: "Agravantes Específicas (Art. 22)",
            notes: "Disfraz, precio/recompensa, odio discriminatorio, ensañamiento y reincidencia.",
            references: ["Art. 22 CP"]
          }
        ]
      },
      {
        id: "t14-b4",
        label: "Catálogo y Clasificación de las Penas (Art. 33)",
        color: "#8b5cf6",
        page: 2,
        notes: "Graves, menos graves y leves según su gravedad aflictiva y duración.",
        references: ["Pág. 2", "Artículo 33 Código Penal"],
        children: [
          {
            id: "t14-b4-s1",
            label: "Penas Graves (Art. 33.2)",
            notes: "Prisión permanente revisable, prisión superior a 5 años, inhabilitación absoluta.",
            references: ["Art. 33.2 CP"]
          },
          {
            id: "t14-b4-s2",
            label: "Penas Menos Graves (Art. 33.3)",
            notes: "Prisión de 3 meses a 5 años, privación carnet 1-8 años, trabajos en beneficio de la comunidad.",
            references: ["Art. 33.3 CP"]
          },
          {
            id: "t14-b4-s3",
            label: "Penas Leves (Art. 33.4)",
            notes: "Multa de hasta 3 meses, localización permanente y privación carnet hasta 1 año.",
            references: ["Art. 33.4 CP"]
          }
        ]
      }
    ]
  },

  "fundamentos-ia": {
    id: "root-fundamentos-ia",
    label: "Fundamentos de IA y Modelos de Lenguaje (LLMs)",
    icon: "psychology",
    notes: "Arquitectura Transformer, redes neuronales profundas, mecanismos de atención y agentes autónomos.",
    references: ["Vaswani et al. (2017)", "RLHF & DPO", "Function Calling Specs"],
    color: "#6366f1",
    children: [
      {
        id: "ia-b1",
        label: "Arquitectura Transformer y Atención",
        color: "#f59e0b",
        page: 1,
        notes: "Mecanismos matemáticos y estructurales de las redes neuronales generativas.",
        references: ["Pág. 1", "Attention is All You Need"],
        children: [
          {
            id: "ia-b1-s1",
            label: "Self-Attention Multi-Head",
            notes: "Matrices de Query, Key y Value para ponderar dependencias léxicas.",
            references: ["Scaled Dot-Product"]
          },
          {
            id: "ia-b1-s2",
            label: "Embeddings Posicionales",
            notes: "Inyección del orden secuencial de los tokens en el espacio latente.",
            references: ["Positional Encoding"]
          }
        ]
      },
      {
        id: "ia-b2",
        label: "Entrenamiento y Alineamiento de LLMs",
        color: "#06b6d4",
        page: 1,
        notes: "Fases de pre-entrenamiento, fine-tuning supervisado y optimización de preferencias.",
        references: ["Pág. 1", "SFT & DPO"],
        children: [
          {
            id: "ia-b2-s1",
            label: "Pre-entrenamiento Autosupervisado",
            notes: "Causal Language Modeling y predicción del siguiente token en billones de parámetros.",
            references: ["Causal LM"]
          },
          {
            id: "ia-b2-s2",
            label: "Alineamiento con RLHF / DPO",
            notes: "Ajuste fino de preferencias humanas para honestidad, utilidad y seguridad.",
            references: ["Direct Preference Optimization"]
          }
        ]
      },
      {
        id: "ia-b3",
        label: "Agentes Autónomos y Tool Calling",
        color: "#10b981",
        page: 2,
        notes: "Sistemas agenticos con razonamiento paso a paso e integración con APIs.",
        references: ["Pág. 2", "ReAct & Tool Use"],
        children: [
          {
            id: "ia-b3-s1",
            label: "Razonamiento ReAct (Thought-Action)",
            notes: "Intercalación sistemática de razonamiento, invocación de herramientas y observación.",
            references: ["Yao et al. (2022)"]
          },
          {
            id: "ia-b3-s2",
            label: "RAG (Retrieval-Augmented Generation)",
            notes: "Búsqueda semántica vectorial de fragmentos relevantes para alimentar el contexto.",
            references: ["Vector Search & Embeddings"]
          }
        ]
      }
    ]
  }
};

// Dynamic Markdown to MindMap Tree Parser
export function parseMarkdownToMindMap(title: string, markdown: string, rootId = "root"): MindMapNode {
  const lines = markdown.split("\n");
  const branchColors = ["#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];

  interface RawNode {
    level: number;
    label: string;
    notes?: string | undefined;
    children: RawNode[];
  }

  const root: RawNode = {
    level: 0,
    label: title.replace(/^Esquema:\s*/i, "").trim() || "Esquema Conceptual",
    children: []
  };

  const stack: RawNode[] = [root];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("---") || trimmed.startsWith("```")) continue;

    let level = 1;
    let label = trimmed;
    let notes: string | undefined;

    if (trimmed.startsWith("# ")) {
      const mainTitle = trimmed.replace(/^#\s+/, "").replace(/\*\*/g, "").replace(/^Esquema:\s*/i, "").trim();
      if (mainTitle) root.label = mainTitle;
      continue;
    } else if (trimmed.startsWith("## ")) {
      level = 1;
      label = trimmed.replace(/^##\s+/, "").replace(/\*\*/g, "").trim();
    } else if (trimmed.startsWith("### ")) {
      level = 2;
      label = trimmed.replace(/^###\s+/, "").replace(/\*\*/g, "").trim();
    } else if (trimmed.startsWith("#### ")) {
      level = 3;
      label = trimmed.replace(/^####\s+/, "").replace(/\*\*/g, "").trim();
    } else if (/^\d+\.\s+/.test(trimmed)) {
      if (/^\d+\.\d+\.\s+/.test(trimmed)) {
        level = 2;
        label = trimmed.replace(/^\d+\.\d+\.\s+/, "").replace(/\*\*/g, "").trim();
      } else {
        level = 1;
        label = trimmed.replace(/\*\*/g, "").trim();
      }
    } else if (/^[-*•]\s+/.test(trimmed)) {
      level = 3;
      const bulletText = trimmed.replace(/^[-*•]\s+/, "").trim();
      const boldMatch = /^\*\*([^*]+)\*\*:\s*(.*)$/.exec(bulletText);
      if (boldMatch) {
        label = boldMatch[1]!.trim();
        notes = boldMatch[2]!.replace(/\*\*/g, "").trim();
      } else {
        label = bulletText.replace(/\*\*/g, "").trim();
      }
    } else if (/^\*\*([^*]+)\*\*:\s*(.*)$/.test(trimmed)) {
      level = 2;
      const boldMatch = /^\*\*([^*]+)\*\*:\s*(.*)$/.exec(trimmed);
      if (boldMatch) {
        label = boldMatch[1]!.trim();
        notes = boldMatch[2]!.replace(/\*\*/g, "").trim();
      }
    } else {
      continue;
    }

    if (!label) continue;

    if (label.length > 50 && !notes) {
      const parts = label.split(/[:.·]/);
      if (parts.length > 1 && parts[0]!.length < 40) {
        notes = label;
        label = parts[0]!.trim();
      }
    }

    const newNode: RawNode = {
      level,
      label,
      notes,
      children: []
    };

    while (stack.length > 1 && stack[stack.length - 1]!.level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]!;
    parent.children.push(newNode);
    stack.push(newNode);
  }

  function convert(node: RawNode, path: string, branchIdx = 0, depth = 0): MindMapNode {
    const color = depth === 0 ? "#6366f1" : depth === 1 ? branchColors[branchIdx % branchColors.length] : undefined;
    return {
      id: `${rootId}-${path}`,
      label: node.label,
      notes: node.notes,
      color,
      children: node.children.length > 0
        ? node.children.map((c, i) => convert(c, `${path}-${i}`, depth === 0 ? i : branchIdx, depth + 1))
        : undefined
    };
  }

  const result = convert(root, "0", 0, 0);

  if (!result.children || result.children.length === 0) {
    return {
      id: rootId,
      label: title || root.label,
      children: []
    };
  }

  return result;
}

function resolveMindMap(
  selectedId: string | null | undefined,
  materials: readonly { readonly id: string; readonly title: string; readonly pageCount: number }[],
  noteArtifactDetail?: NoteArtifact | null
): MindMapNode | null {
  if (noteArtifactDetail && noteArtifactDetail.markdown) {
    return parseMarkdownToMindMap(noteArtifactDetail.title, noteArtifactDetail.markdown, noteArtifactDetail.id);
  }

  if (selectedId && mindMapsByMaterialId[selectedId]) {
    return mindMapsByMaterialId[selectedId]!;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Dendritic Layout Engine: Accurate Coordinates & SVG Curves Calculation
// ---------------------------------------------------------------------------

interface PositionedNode {
  readonly id: string;
  readonly label: string;
  readonly notes?: string | undefined;
  readonly references?: readonly string[] | undefined;
  readonly page?: number | undefined;
  readonly color: string;
  readonly icon?: string | undefined;
  readonly level: number;
  readonly side: "left" | "right";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly parentAnchorX: number;
  readonly parentAnchorY: number;
  readonly children: readonly PositionedNode[];
  readonly hasChildren: boolean;
  readonly isCollapsed: boolean;
  readonly rawNode: MindMapNode;
}

interface ConnectorLine {
  readonly id: string;
  readonly color: string;
  readonly strokeWidth: number;
  readonly pathD: string;
  readonly isBranchHovered?: boolean;
}

function getNodeDimensions(label: string, level: number): { width: number; height: number } {
  if (level === 0) {
    return { width: 280, height: 64 };
  }
  if (level === 1) {
    const length = label.length;
    const width = Math.min(320, Math.max(220, length * 7.0 + 50));
    return { width, height: length > 28 ? 58 : 46 };
  }
  if (level === 2) {
    const length = label.length;
    const width = Math.min(300, Math.max(200, length * 6.6 + 40));
    return { width, height: length > 26 ? 54 : 42 };
  }
  // Level 3+
  const length = label.length;
  const width = Math.min(310, Math.max(190, length * 6.2 + 36));
  return { width, height: length > 28 ? 52 : 40 };
}

function computeSubtreeHeight(
  node: MindMapNode,
  level: number,
  collapsedIds: Set<string>
): number {
  const isCollapsed = collapsedIds.has(node.id);
  const dims = getNodeDimensions(node.label, level);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  if (!hasChildren || isCollapsed) {
    return dims.height + 14; // height + vertical gap
  }

  let totalChildHeight = 0;
  for (const child of node.children!) {
    totalChildHeight += computeSubtreeHeight(child, level + 1, collapsedIds);
  }

  return Math.max(dims.height + 14, totalChildHeight);
}

function layoutSubtree(
  node: MindMapNode,
  level: number,
  side: "left" | "right",
  startX: number,
  centerY: number,
  branchColor: string,
  parentAnchorX: number,
  parentAnchorY: number,
  collapsedIds: Set<string>
): { positionedNode: PositionedNode; connectors: ConnectorLine[] } {
  const isCollapsed = collapsedIds.has(node.id);
  const dims = getNodeDimensions(node.label, level);
  const color = node.color || branchColor;
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const nodeX = side === "right" ? startX : startX - dims.width;
  const nodeY = centerY - dims.height / 2;

  // Anchor points for outgoing curves
  const outAnchorX = side === "right" ? nodeX + dims.width : nodeX;
  const outAnchorY = centerY;

  const connectors: ConnectorLine[] = [];

  // Connector from parent to this node
  if (level > 0) {
    const inAnchorX = side === "right" ? nodeX : nodeX + dims.width;
    const inAnchorY = centerY;
    const dx = Math.abs(inAnchorX - parentAnchorX);
    const cp1X = parentAnchorX + (side === "right" ? 1 : -1) * (dx * 0.5);
    const cp1Y = parentAnchorY;
    const cp2X = inAnchorX - (side === "right" ? 1 : -1) * (dx * 0.5);
    const cp2Y = inAnchorY;

    connectors.push({
      id: `conn-${node.id}`,
      color,
      strokeWidth: level === 1 ? 3.5 : level === 2 ? 2.5 : 1.8,
      pathD: `M ${parentAnchorX} ${parentAnchorY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${inAnchorX} ${inAnchorY}`
    });
  }

  const positionedChildren: PositionedNode[] = [];

  if (hasChildren && !isCollapsed) {
    const nextLevel = level + 1;
    // Horizontal distance between levels
    const levelSpacing = level === 0 ? 80 : level === 1 ? 70 : 60;
    const nextStartX = side === "right" ? outAnchorX + levelSpacing : outAnchorX - levelSpacing;

    // Calculate total height of all children
    const childHeights = node.children!.map((child) =>
      computeSubtreeHeight(child, nextLevel, collapsedIds)
    );
    const totalChildrenHeight = childHeights.reduce((acc, h) => acc + h, 0);

    let currentY = centerY - totalChildrenHeight / 2;

    node.children!.forEach((child, index) => {
      const chHeight = childHeights[index]!;
      const childCenterY = currentY + chHeight / 2;

      const { positionedNode: posChild, connectors: childConns } = layoutSubtree(
        child,
        nextLevel,
        side,
        nextStartX,
        childCenterY,
        color,
        outAnchorX,
        outAnchorY,
        collapsedIds
      );

      positionedChildren.push(posChild);
      connectors.push(...childConns);

      currentY += chHeight;
    });
  }

  const positionedNode: PositionedNode = {
    id: node.id,
    label: node.label,
    notes: node.notes,
    references: node.references,
    page: node.page,
    color,
    icon: node.icon,
    level,
    side,
    x: nodeX,
    y: nodeY,
    width: dims.width,
    height: dims.height,
    parentAnchorX,
    parentAnchorY,
    children: positionedChildren,
    hasChildren,
    isCollapsed,
    rawNode: node
  };

  return { positionedNode, connectors };
}

// ---------------------------------------------------------------------------
// Main MindMapViewer Component
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
  const refreshMaterials = useAtomRefresh(materialsQuery);

  const materialsList = useMemo(() => {
    return AsyncResult.match(materialsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.materials
    });
  }, [materialsResult]);

  const materialsStatus = useMemo(
    () =>
      AsyncResult.match(materialsResult, {
        onInitial: () => "loading" as const,
        onFailure: () => "error" as const,
        onSuccess: ({ value }) => (value.materials.length > 0 ? "ready" : "empty")
      }),
    [materialsResult]
  );

  const activeMaterialId = selectedMaterialId ?? materialsList[0]?.id ?? null;

  const artifactsResult = useAtomValue(artifactsQuery);
  const allArtifacts = useMemo(() => {
    return AsyncResult.match(artifactsResult, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value }) => value.artifacts
    });
  }, [artifactsResult]);

  const activeMaterial = useMemo(
    () => materialsList.find((m) => m.id === activeMaterialId),
    [materialsList, activeMaterialId]
  );

  const matchingNoteSummary = useMemo(() => {
    if (allArtifacts.length === 0) return null;
    const matTitle = (activeMaterial?.title ?? activeMaterialId ?? "").toLowerCase();
    const cleanMatTitle = matTitle.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();

    const noteArtifacts = allArtifacts.filter((a) => a.kind === "note");
    if (noteArtifacts.length === 0) return null;

    const matched = noteArtifacts.find((a) => {
      const aTitle = a.title.toLowerCase().replace(/[-_]/g, " ").trim();
      return (
        aTitle.includes(cleanMatTitle) ||
        cleanMatTitle.includes(aTitle) ||
        (activeMaterialId && aTitle.includes(activeMaterialId.toLowerCase()))
      );
    });

    if (matched) return matched;

    return null;
  }, [activeMaterialId, activeMaterial, allArtifacts]);

  const noteQuery = artifactQuery(matchingNoteSummary?.id ?? "");
  const noteQueryResult = useAtomValue(noteQuery);

  const activeNoteDetail = useMemo(() => {
    if (!matchingNoteSummary) return null;
    return AsyncResult.match(noteQueryResult, {
      onInitial: () => null,
      onFailure: () => null,
      onSuccess: ({ value }) => (value.kind === "note" ? value : null)
    });
  }, [matchingNoteSummary, noteQueryResult]);

  const currentMindMap = useMemo(() => {
    if (initialData) return initialData;
    return resolveMindMap(activeMaterialId, materialsList, activeNoteDetail);
  }, [activeMaterialId, initialData, materialsList, activeNoteDetail]);

  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(currentMindMap);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Infinite Canvas Pan & Zoom (Starts with a comfortable auto-fitted scale)
  const [zoom, setZoom] = useState<number>(0.52);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const drawerToggleRef = useRef<HTMLButtonElement>(null);

  const isLight = theme === "light";

  useEffect(() => {
    setSelectedNode(currentMindMap);
  }, [currentMindMap]);

  const handleSelectNode = (node: MindMapNode) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    requestAnimationFrame(() => drawerToggleRef.current?.focus());
  };

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

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest(".mindmap-node") || target.closest("aside")) {
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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.max(0.30, Math.min(2.0, Number((z * zoomFactor).toFixed(2)))));
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX * 0.9,
        y: p.y - e.deltaY * 0.9
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Compute Complete Dendritic Layout Coordinates
  // ---------------------------------------------------------------------------

  const { allNodes, allConnectors } = useMemo(() => {
    if (!currentMindMap) {
      return { allNodes: [], allConnectors: [] };
    }
    const branches = currentMindMap.children ?? [];
    const rightRawBranches = branches.filter((_, i) => i % 2 === 0);
    const leftRawBranches = branches.filter((_, i) => i % 2 === 1);

    const rootDims = getNodeDimensions(currentMindMap.label, 0);
    const rootX = -rootDims.width / 2;
    const rootY = -rootDims.height / 2;

    const rootPosNode: PositionedNode = {
      id: currentMindMap.id,
      label: currentMindMap.label,
      notes: currentMindMap.notes,
      references: currentMindMap.references,
      page: currentMindMap.page,
      color: currentMindMap.color || "#06b6d4",
      icon: currentMindMap.icon || "gavel",
      level: 0,
      side: "right",
      x: rootX,
      y: rootY,
      width: rootDims.width,
      height: rootDims.height,
      parentAnchorX: 0,
      parentAnchorY: 0,
      children: [],
      hasChildren: branches.length > 0,
      isCollapsed: false,
      rawNode: currentMindMap
    };

    const connectors: ConnectorLine[] = [];
    const flattenedNodes: PositionedNode[] = [rootPosNode];

    // Layout Right Side Branches
    const rightBranchHeights = rightRawBranches.map((b) =>
      computeSubtreeHeight(b, 1, collapsedIds)
    );
    const totalRightHeight = rightBranchHeights.reduce((acc, h) => acc + h, 0);
    let rightY = -totalRightHeight / 2;

    rightRawBranches.forEach((branch, idx) => {
      const bHeight = rightBranchHeights[idx]!;
      const branchCenterY = rightY + bHeight / 2;
      const branchStartX = rootDims.width / 2 + 70;
      const rootRightAnchorX = rootDims.width / 2;
      const rootRightAnchorY = 0;

      const { positionedNode: pBranch, connectors: bConns } = layoutSubtree(
        branch,
        1,
        "right",
        branchStartX,
        branchCenterY,
        branch.color || "#06b6d4",
        rootRightAnchorX,
        rootRightAnchorY,
        collapsedIds
      );

      connectors.push(...bConns);
      flattenTree(pBranch, flattenedNodes);

      rightY += bHeight;
    });

    // Layout Left Side Branches
    const leftBranchHeights = leftRawBranches.map((b) =>
      computeSubtreeHeight(b, 1, collapsedIds)
    );
    const totalLeftHeight = leftBranchHeights.reduce((acc, h) => acc + h, 0);
    let leftY = -totalLeftHeight / 2;

    leftRawBranches.forEach((branch, idx) => {
      const bHeight = leftBranchHeights[idx]!;
      const branchCenterY = leftY + bHeight / 2;
      const branchStartX = -rootDims.width / 2 - 70;
      const rootLeftAnchorX = -rootDims.width / 2;
      const rootLeftAnchorY = 0;

      const { positionedNode: pBranch, connectors: bConns } = layoutSubtree(
        branch,
        1,
        "left",
        branchStartX,
        branchCenterY,
        branch.color || "#06b6d4",
        rootLeftAnchorX,
        rootLeftAnchorY,
        collapsedIds
      );

      connectors.push(...bConns);
      flattenTree(pBranch, flattenedNodes);

      leftY += bHeight;
    });

    return {
      allNodes: flattenedNodes,
      allConnectors: connectors
    };
  }, [currentMindMap, collapsedIds]);

  // Dynamic Bounding Box Calculation for Auto-Fit
  const bounds = useMemo(() => {
    if (allNodes.length === 0) {
      return { minX: -500, maxX: 500, minY: -300, maxY: 300, width: 1000, height: 600 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const n of allNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x + n.width > maxX) maxX = n.x + n.width;
      if (n.y < minY) minY = n.y;
      if (n.y + n.height > maxY) maxY = n.y + n.height;
    }
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(300, maxX - minX),
      height: Math.max(200, maxY - minY)
    };
  }, [allNodes]);

  const fitView = useCallback(() => {
    if (!canvasRef.current) return;
    const containerW = canvasRef.current.clientWidth;
    const containerH = canvasRef.current.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    const paddingX = 80;
    const paddingY = 60;
    const scaleX = (containerW - paddingX) / bounds.width;
    const scaleY = (containerH - paddingY) / bounds.height;
    const optimalZoom = Math.max(0.35, Math.min(1.0, Number(Math.min(scaleX, scaleY).toFixed(2))));

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    setZoom(optimalZoom);
    setPan({ x: -centerX * optimalZoom, y: -centerY * optimalZoom });
  }, [bounds]);

  const resetView = () => {
    fitView();
  };

  // Auto-fit on initial render or when active topic changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView();
    }, 60);
    return () => clearTimeout(timer);
  }, [fitView, currentMindMap?.id]);

  if (!initialData && materialsStatus !== "ready") {
    return (
      <div className={`flex h-full items-center justify-center p-6 text-center ${isLight ? "bg-slate-50 text-slate-600" : "bg-slate-950 text-slate-300"}`}>
        <div className="max-w-sm">
          {materialsStatus === "loading" ? (
            <>
              <span className="ui-spinner mx-auto" aria-hidden="true" />
              <p className="mt-3 text-sm">Cargando esquema…</p>
            </>
          ) : materialsStatus === "error" ? (
            <>
              <span className="material-symbols-outlined text-3xl text-red-500" aria-hidden="true">error</span>
              <p className="mt-3 text-sm">No se pudo cargar el esquema.</p>
              <button type="button" className="ui-secondary-action mt-4" onClick={() => refreshMaterials()}>
                Reintentar
              </button>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-3xl text-slate-400" aria-hidden="true">schema</span>
              <p className="mt-3 text-sm">Aún no hay materiales para crear un esquema.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full w-full overflow-hidden relative select-none transition-colors ${
        isLight ? "bg-[#f8fafc] text-slate-900" : "bg-[#080c14] text-slate-100"
      }`}
    >
      {/* Main Interactive Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Control Bar */}
        <header
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b backdrop-blur z-20 transition-colors shrink-0 ${
            isLight ? "border-slate-200 bg-white/90" : "border-slate-800/90 bg-slate-950/80"
          }`}
        >
          {/* Material Selector & AI Generator */}
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
                value={activeMaterialId ?? ""}
                onChange={(e) => onSelectMaterialId?.(e.target.value)}
                disabled={materialsList.length === 0}
                className={`text-xs font-semibold rounded-xl px-3 py-1.5 border transition cursor-pointer outline-none max-w-[260px] truncate ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-800 hover:border-indigo-500 shadow-sm"
                    : "bg-slate-900 border-slate-700 text-slate-100 hover:border-indigo-400"
                }`}
              >
                {materialsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.pageCount} págs)
                  </option>
                ))}
              </select>

              {onGenerateAiMap && (
                <button
                  type="button"
                  onClick={() => onGenerateAiMap(currentMindMap?.label ?? activeMaterial?.title ?? "este documento")}
                  className="ui-primary-action"
                  title="Pedir al tutor que profundice en el esquema"
                >
                  <span className="material-symbols-outlined text-[16px]">account_tree</span>
                  <span className="hidden sm:inline">Profundizar</span>
                </button>
              )}

              {activeNoteDetail && (
                <span className="hidden md:inline-flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 rounded-full px-2.5 py-1 text-[11px] font-semibold animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px] text-purple-500">auto_awesome</span>
                  <span>Esquema IA</span>
                </span>
              )}
            </div>
          </div>

          {/* Canvas Navigation Toolbar */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center rounded-xl p-0.5 text-xs border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Reducir zoom (−)"
                aria-label="Reducir zoom del esquema"
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
                onClick={() => setZoom((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                className={`grid size-9 place-items-center rounded-lg transition ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
                title="Aumentar zoom (+)"
                aria-label="Aumentar zoom del esquema"
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
              title="Centrar esquema"
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
              aria-pressed={showMinimap}
              aria-label={showMinimap ? "Ocultar minimapa" : "Mostrar minimapa"}
            >
              <span className="material-symbols-outlined text-sm">map</span>
            </button>

            <button
              type="button"
              ref={drawerToggleRef}
              onClick={() => (isDrawerOpen ? closeDrawer() : setIsDrawerOpen(true))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                isDrawerOpen
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                  : isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title={isDrawerOpen ? "Ocultar ficha de concepto" : "Abrir ficha de concepto"}
              aria-expanded={isDrawerOpen}
            >
              <span className="material-symbols-outlined text-xs">
                {isDrawerOpen ? "dock_to_right" : "dock_to_left"}
              </span>
              <span>{isDrawerOpen ? "Ocultar ficha" : "Ver ficha"}</span>
            </button>
          </div>
        </header>

        {/* 2. Interactive Infinite Canvas OR Specific Document Empty State */}
        {!currentMindMap ? (
          <div
            className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-6"
            style={{
              backgroundImage: isLight
                ? "radial-gradient(#cbd5e1 1px, transparent 1px)"
                : "radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          >
            <div className="flex max-w-md flex-col items-center text-center p-8 rounded-2xl border bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg">
              <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">account_tree</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {activeMaterial ? activeMaterial.title : "Documento sin esquema"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Este archivo aún no tiene un esquema conceptual generado. Pídele al tutor inteligente que analice el documento y genere su mapa mental interactivo.
              </p>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {onGenerateAiMap && activeMaterial && (
                  <button
                    type="button"
                    onClick={() => onGenerateAiMap(activeMaterial.title)}
                    className="ui-primary-action"
                  >
                    <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                    <span>Generar Esquema con IA</span>
                  </button>
                )}
                {onOpenPdfPage && activeMaterial && (
                  <button
                    type="button"
                    onClick={() => onOpenPdfPage(activeMaterial.id, 1)}
                    className="ui-secondary-action"
                  >
                    <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                    <span>Ver PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
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
            {/* Floating Reopen Button if Drawer is Closed */}
            {!isDrawerOpen && selectedNode && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={`ui-float-enter absolute top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl border shadow-lg backdrop-blur transition-colors ${
                  isLight
                    ? "bg-white/95 border-indigo-200 text-indigo-700 hover:border-indigo-400 shadow-indigo-100"
                    : "bg-slate-900/95 border-indigo-800/80 text-indigo-300 hover:border-indigo-500 shadow-black/80"
                }`}
                title="Abrir ficha del concepto"
              >
                <span className="material-symbols-outlined text-base text-indigo-500">
                  dock_to_left
                </span>
                <div className="text-left max-w-[150px]">
                  <span className="block text-[9px] font-mono font-bold uppercase text-indigo-500 tracking-wider">
                    Ficha de Concepto
                  </span>
                  <span className="block text-xs font-semibold truncate">
                    {selectedNode?.label}
                  </span>
                </div>
                <span className="material-symbols-outlined text-sm text-indigo-400">
                  chevron_left
                </span>
              </button>
            )}

          {/* Pan Hint Overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 opacity-70">
            <span
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${
                isLight
                  ? "bg-white/80 border-slate-200 text-slate-600"
                  : "bg-slate-950/80 border-slate-800 text-slate-400"
              }`}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">pan_tool_alt</span>
              Arrastra el fondo para moverte · Ctrl + rueda para ampliar
            </span>
          </div>

          {/* Scaled & Translated World */}
          <div
            className="transition-transform duration-75 ease-out origin-center relative pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: 0,
              height: 0
            }}
          >
            {/* SVG Connecting Curves Layer */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              style={{ zIndex: 1 }}
            >
              <defs>
              </defs>
              {allConnectors.map((conn) => (
                <path
                  key={conn.id}
                  d={conn.pathD}
                  fill="none"
                  stroke={conn.color}
                  strokeWidth={conn.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isLight ? 0.85 : 0.75}
                  className="transition-[stroke,opacity] duration-200"
                  style={{ filter: undefined }}
                />
              ))}
            </svg>

            {/* Positioned Node Cards Layer */}
            <div className="absolute top-0 left-0 overflow-visible" style={{ zIndex: 10 }}>
              {allNodes.map((pNode) => {
                const isSelected = selectedNode?.id === pNode.id;
                const isRoot = pNode.level === 0;
                const isLevel1 = pNode.level === 1;

                return (
                  <div
                    key={pNode.id}
                    style={{
                      position: "absolute",
                      left: `${pNode.x}px`,
                      top: `${pNode.y}px`,
                      width: `${pNode.width}px`,
                      minHeight: `${pNode.height}px`,
                      borderColor: isRoot
                        ? undefined
                        : isSelected
                        ? pNode.color
                        : isLevel1
                        ? pNode.color
                        : isLight
                        ? `${pNode.color}90`
                        : `${pNode.color}60`,
                      boxShadow:
                        !isRoot && isSelected
                          ? `0 0 16px ${pNode.color}40`
                          : undefined
                    }}
                    className={`mindmap-node pointer-events-auto rounded-2xl transition-[background-color,border-color,color,box-shadow,transform] duration-200 flex items-center justify-between gap-2 shadow-lg ${
                      isRoot
                        ? isLight
                          ? "rounded-xl px-5 py-3 border-2 border-cyan-500 bg-white shadow-md"
                          : "rounded-xl px-5 py-3 border-2 border-cyan-400 bg-slate-900/95 shadow-md"
                        : isLevel1
                        ? isSelected
                          ? isLight
                            ? "px-3.5 py-2 border-2 bg-white shadow-md ring-1"
                            : "px-3.5 py-2 border-2 bg-slate-900 shadow-md ring-1"
                          : isLight
                          ? "px-3.5 py-2 border-2 bg-white/95 hover:bg-white shadow-sm"
                          : "px-3.5 py-2 border-2 bg-slate-900/90 hover:bg-slate-900 shadow-sm"
                        : isSelected
                        ? isLight
                          ? "px-3 py-1.5 rounded-xl border bg-indigo-50/90 shadow-sm ring-1 ring-indigo-400"
                          : "px-3 py-1.5 rounded-xl border bg-indigo-950/80 shadow-sm ring-1 ring-indigo-400"
                        : isLight
                          ? "px-3 py-1.5 rounded-xl border bg-white/90 hover:bg-white shadow-sm"
                          : "px-3 py-1.5 rounded-xl border bg-slate-950/90 hover:bg-slate-900 shadow-sm"
                    }`}
                  >
                    {/* Node Content */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectNode(pNode.rawNode);
                      }}
                      aria-label={`Abrir concepto ${pNode.label}`}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {isRoot ? (
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-500 font-bold text-sm">
                            <span className="material-symbols-outlined text-base">
                              {pNode.icon || "gavel"}
                            </span>
                          </span>
                          <span
                            className={`font-display font-bold text-sm sm:text-base leading-tight tracking-tight ${
                              isLight ? "text-slate-900" : "text-white"
                            }`}
                          >
                            {pNode.label}
                          </span>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: pNode.color }}
                            />
                            <span
                              title={pNode.label}
                              className={`block font-display break-words line-clamp-2 leading-snug ${
                                isLevel1
                                  ? isLight
                                    ? "font-bold text-xs text-slate-900"
                                    : "font-bold text-xs text-slate-100"
                                  : isLight
                                  ? "font-medium text-[11px] text-slate-800"
                                  : "font-medium text-[11px] text-slate-200"
                              }`}
                            >
                              {pNode.label}
                            </span>
                          </div>

                          {pNode.references && pNode.references[0] && (
                            <span
                              title={pNode.references[0]}
                              className={`block text-[9px] font-mono break-words line-clamp-1 mt-0.5 ${
                                isLight ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {pNode.references[0]}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Expand/Collapse Toggle Button for Branches */}
                    {pNode.hasChildren && !isRoot && (
                      <button
                        type="button"
                        onClick={(e) => toggleCollapse(pNode.id, e)}
                        className={`size-8 grid place-items-center rounded-lg text-xs font-bold shrink-0 transition ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                        }`}
                        style={{
                          color: pNode.color
                        }}
                        title={
                          pNode.isCollapsed ? "Expandir conceptos" : "Colapsar conceptos"
                        }
                        aria-label={
                          pNode.isCollapsed
                            ? `Expandir conceptos de ${pNode.label}`
                            : `Colapsar conceptos de ${pNode.label}`
                        }
                      >
                        {pNode.isCollapsed ? "+" : "−"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

        {/* 3. Floating Radar / Minimap Overlay */}
        {showMinimap && !isDrawerOpen && currentMindMap && (
          <div
            className={`ui-float-enter absolute bottom-4 right-4 z-20 flex h-36 w-48 flex-col justify-between rounded-2xl border p-2.5 shadow-2xl backdrop-blur ${
              isLight
                ? "bg-white/90 border-slate-300 text-slate-700 shadow-slate-200"
                : "bg-slate-950/90 border-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
              <span className="flex items-center gap-1 text-cyan-500">
                <span className="size-1.5 rounded-full bg-cyan-500"></span>
                <span>Vista general</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMinimap(false)}
                className="grid size-9 min-h-9 min-w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-500/10 hover:text-slate-600"
                aria-label="Ocultar minimapa"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
              </button>
            </div>

            {/* Schematic Mini Visual Representation */}
            <div className="flex-1 my-1 relative rounded-lg border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              <div className="size-3.5 rounded-full bg-cyan-500 shadow-sm"></div>
              <div className="absolute left-3 top-3 size-2 rounded-full bg-amber-500"></div>
              <div className="absolute left-3 bottom-3 size-2 rounded-full bg-pink-500"></div>
              <div className="absolute right-3 top-3 size-2 rounded-full bg-teal-500"></div>
              <div className="absolute right-3 bottom-3 size-2 rounded-full bg-purple-500"></div>
              <div
                className="pointer-events-none absolute rounded border-2 border-cyan-500 bg-cyan-500/10"
                style={{
                  width: `${Math.max(25, Math.min(80, 50 / zoom))}%`,
                  height: `${Math.max(25, Math.min(80, 50 / zoom))}%`,
                  transform: `translate(${-pan.x * 0.04}px, ${-pan.y * 0.04}px)`
                }}
              />
            </div>

            <span className="text-[9px] text-center text-slate-400 font-mono">
              Zoom: {Math.round(zoom * 100)}% · {allNodes.length} conceptos
            </span>
          </div>
        )}
      </div>

      {/* 4. Right Detail Drawer (Concept & Article Details) */}
      {isDrawerOpen && selectedNode && currentMindMap && (
        <aside
          className={`ui-panel-enter absolute inset-y-0 right-0 z-30 flex h-full w-[min(23rem,calc(100%-3rem))] max-w-full flex-col overflow-y-auto border-l p-5 backdrop-blur ${
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
                style={{ backgroundColor: selectedNode.color || "#06b6d4" }}
              />
              <span
                className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${
                  isLight ? "text-slate-500" : "text-slate-400"
                }`}
              >
                Ficha del concepto
              </span>
            </div>
            <button
              type="button"
              onClick={closeDrawer}
              className={`grid size-9 place-items-center rounded-lg transition ${
                isLight
                  ? "text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
              title="Ocultar ficha"
              aria-label="Ocultar ficha de concepto"
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
                  Explicación
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
                  Referencias
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
                  Apartados relacionados ({selectedNode.children.length})
                </span>
                <div className="space-y-1.5">
                  {selectedNode.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => handleSelectNode(child)}
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

            {selectedNode.page && onOpenPdfPage && activeMaterialId && (
              <button
                type="button"
                onClick={() => onOpenPdfPage(activeMaterialId, selectedNode.page!)}
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

function flattenTree(node: PositionedNode, result: PositionedNode[]): void {
  result.push(node);
  if (node.children && !node.isCollapsed) {
    for (const child of node.children) {
      flattenTree(child, result);
    }
  }
}
