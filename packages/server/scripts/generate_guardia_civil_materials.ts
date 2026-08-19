import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface TopicPage {
  title: string;
  sections: Array<{ subtitle: string; content: string[] }>;
}

interface TopicData {
  fileName: string;
  title: string;
  pages: TopicPage[];
}

const topics: TopicData[] = [
  {
    fileName: "tema-1-constitucion-espanola.pdf",
    title: "Tema 1: Constitución Española de 1978 y Derechos Fundamentales",
    pages: [
      {
        title: "TEMA 1: CONSTITUCIÓN ESPAÑOLA DE 1978 (PARTE 1)",
        sections: [
          {
            subtitle: "1. Estructura y Principios Constitucionales (Título Preliminar)",
            content: [
              "La Constitución Española de 1978 consta de 169 artículos, 4 disposiciones adicionales,",
              "9 disposiciones transitorias, 1 disposición derogatoria y 1 disposición final.",
              "El Artículo 1.1 proclama que España se constituye en un Estado social y democrático de Derecho,",
              "que propugna como valores superiores de su ordenamiento jurídico la libertad, la justicia,",
              "la igualdad y el pluralismo político.",
              "La soberanía nacional reside en el pueblo español, del que emanan los poderes del Estado (Art. 1.2).",
              "La forma política del Estado español es la Monarquía parlamentaria (Art. 1.3)."
            ]
          },
          {
            subtitle: "2. La Corona y las Fuerzas Armadas (Arts. 2, 8 y 9)",
            content: [
              "El Art. 2 fundamenta la Constitución en la indisoluble unidad de la Nación española, patria común",
              "e indivisible de todos los españoles, reconociendo el derecho a la autonomía de las nacionalidades.",
              "El Art. 8 establece que las Fuerzas Armadas (Ejército de Tierra, Armada y Ejército del Aire)",
              "tienen como misión garantizar la soberanía e independencia de España, defender su integridad",
              "territorial y el ordenamiento constitucional.",
              "El Art. 9.3 garantiza el principio de legalidad, la jerarquía normativa, la publicidad de las normas,",
              "la irretroactividad de las disposiciones sancionadoras no favorables y la seguridad jurídica."
            ]
          }
        ]
      },
      {
        title: "TEMA 1: CONSTITUCIÓN ESPAÑOLA DE 1978 (PARTE 2)",
        sections: [
          {
            subtitle: "3. Derechos y Libertades Fundamentales (Capítulo II, Sección 1ª)",
            content: [
              "Artículo 14: Los españoles son iguales ante la ley, sin que pueda prevalecer discriminación alguna.",
              "Artículo 15: Todos tienen derecho a la vida y a la integridad física y moral, quedando abolida la pena de muerte.",
              "Artículo 17: Derecho a la libertad y a la seguridad. La detención preventiva no podrá durar más del tiempo",
              "estrictamente necesario para la realización de las averiguaciones (plazo máximo de 72 horas).",
              "Garantía del procedimiento de 'Habeas Corpus' para producir la inmediata puesta a disposición judicial.",
              "Artículo 18: Se garantiza el derecho al honor, a la intimidad personal y familiar y a la propia imagen.",
              "El domicilio es inviolable. Ninguna entrada o registro podrá hacerse sin consentimiento o resolución judicial,",
              "salvo en caso de flagrante delito."
            ]
          },
          {
            subtitle: "4. Garantías y Suspensión de Derechos (Arts. 53, 55 y 116)",
            content: [
              "Los derechos reconocidos en los Arts. 14 a 29 y 30.2 son tutelables mediante el recurso de amparo",
              "ante el Tribunal Constitucional y mediante procedimiento preferente y sumario ante tribunales ordinarios.",
              "En los estados de excepción y sitio pueden suspenderse derechos como la libertad personal (Art. 17),",
              "la inviolabilidad del domicilio (Art. 18.2), el secreto de las comunicaciones (Art. 18.3) y la huelga (Art. 28.2)."
            ]
          }
        ]
      }
    ]
  },
  {
    fileName: "tema-4-organizacion-territorial.pdf",
    title: "Tema 4: Organización Territorial del Estado y Administración Local",
    pages: [
      {
        title: "TEMA 4: ORGANIZACIÓN TERRITORIAL DEL ESTADO (PARTE 1)",
        sections: [
          {
            subtitle: "1. Principios Generales del Título VIII (Arts. 137 a 139)",
            content: [
              "El Estado se organiza territorialmente en municipios, en provincias y en las Comunidades Autónomas",
              "que se constituyan. Todas estas entidades gozan de autonomía para la gestión de sus respectivos intereses.",
              "Principio de Solidaridad (Art. 138): El Estado garantiza la realización efectiva del principio de solidaridad,",
              "velando por el establecimiento de un equilibrio económico adecuado y justo entre las diversas partes.",
              "Las diferencias entre los Estatutos de las CCAA no podrán implicar privilegios económicos o sociales.",
              "Igualdad de los ciudadanos (Art. 139): Todos los españoles tienen los mismos derechos y obligaciones",
              "en cualquier parte del territorio del Estado. Ninguna autoridad podrá adoptar medidas que obstaculicen",
              "la libertad de circulación y establecimiento de personas y bienes."
            ]
          },
          {
            subtitle: "2. La Administración Local: Municipios y Provincias (Arts. 140 a 142)",
            content: [
              "El Municipio es la entidad básica de la organización territorial. Su gobierno y administración",
              "corresponde a sus respectivos Ayuntamientos, integrados por Alcaldes y Concejales.",
              "La Provincia es una entidad local con personalidad jurídica propia, determinada por la agrupación",
              "de municipios y división territorial para el cumplimiento de las actividades del Estado.",
              "El gobierno y administración autónoma de las provincias estará encomendado a Diputaciones u otras Corporaciones.",
              "Haciendas Locales: Deberán disponer de los medios suficientes para el desempeño de sus funciones."
            ]
          }
        ]
      },
      {
        title: "TEMA 4: ORGANIZACIÓN TERRITORIAL DEL ESTADO (PARTE 2)",
        sections: [
          {
            subtitle: "3. Comunidades Autónomas y Estatutos de Autonomía (Arts. 143 a 158)",
            content: [
              "Vías de acceso a la autonomía: Vía ordinaria o lenta (Art. 143) y Vía especial o rápida (Art. 151).",
              "El Estatuto de Autonomía es la norma institucional básica de cada Comunidad Autónoma y el Estado",
              "los reconocerá y amparará como parte integrante de su ordenamiento jurídico (Art. 147).",
              "Competencias exclusivas del Estado (Art. 149.1): Nacionalidad, relaciones internacionales, defensa y",
              "Fuerzas Armadas, administración de justicia, legislación penal y procesal, y seguridad pública (149.1.29ª),",
              "sin perjuicio de la posibilidad de creación de policías por las Comunidades Autónomas."
            ]
          }
        ]
      }
    ]
  },
  {
    fileName: "tema-9-ley-organica-fuerzas-seguridad.pdf",
    title: "Tema 9: Ley Orgánica 2/1986 de Fuerzas y Cuerpos de Seguridad",
    pages: [
      {
        title: "TEMA 9: FUERZAS Y CUERPOS DE SEGURIDAD (LO 2/1986)",
        sections: [
          {
            subtitle: "1. Principios Básicos de Actuación (Artículo 5)",
            content: [
              "Adecuación al ordenamiento jurídico: Ejercer su función con absoluto respeto a la Constitución y leyes.",
              "Relaciones con la comunidad: Impedir cualquier práctica abusiva, arbitraria o discriminatoria.",
              "Tratamiento de detenidos: Velar por la vida e integridad física de las personas a quienes detuvieren.",
              "Dedicación profesional: Deberán llevar a cabo sus funciones con total dedicación, debiendo intervenir",
              "siempre, en cualquier tiempo y lugar, se hallaren o no de servicio, en defensa de la Ley y la seguridad ciudadana.",
              "Uso de armas: En el ejercicio de sus funciones deberán actuar con la decisión necesaria y sin demora,",
              "rigiéndose por los principios de congruencia, oportunidad y proporcionalidad en la utilización de los medios."
            ]
          },
          {
            subtitle: "2. Naturaleza y Estructura de la Guardia Civil (Capítulo II)",
            content: [
              "La Guardia Civil es un Instituto Armado de naturaleza militar, dependiente del Ministerio del Interior",
              "en el desempeño de las funciones de seguridad ciudadana, y del Ministerio de Defensa en el cumplimiento",
              "de las misiones de carácter militar que se le encomienden.",
              "Distribución territorial: La Guardia Civil ejerce sus competencias en el territorio nacional y su mar territorial,",
              "con responsabilidad preferente en el ámbito rural y en las vías interurbanas de comunicación."
            ]
          }
        ]
      },
      {
        title: "TEMA 9: COMPETENCIAS ESPECÍFICAS DE LA GUARDIA CIVIL",
        sections: [
          {
            subtitle: "3. Competencias Exclusivas de la Guardia Civil (Artículo 12.1.b)",
            content: [
              "1. Las derivadas de la legislación vigente sobre armas y explosivos (Intervención de Armas).",
              "2. El resguardo fiscal del Estado y las actuaciones encaminadas a evitar y perseguir el contrabando.",
              "3. La vigilancia del tráfico, tránsito y transporte en las vías públicas interurbanas (Agrupación de Tráfico).",
              "4. La custodia de vías de comunicación terrestre, costas, fronteras, puertos, aeropuertos y centros penitenciarios.",
              "5. Velar por el cumplimiento de las disposiciones para la conservación de la naturaleza y medio ambiente (SEPRONA).",
              "6. La conducción interurbana de presos y detenidos."
            ]
          },
          {
            subtitle: "4. Policía Judicial y Coordinación Policial (Arts. 29 a 36)",
            content: [
              "Las Unidades de Policía Judicial dependen orgánicamente del Ministerio del Interior y funcionalmente",
              "de los Jueces, Tribunales y del Ministerio Fiscal en las actuaciones de averiguación del delito.",
              "Órganos de coordinación: Consejo de Política de Seguridad y Juntas Locales de Seguridad."
            ]
          }
        ]
      }
    ]
  },
  {
    fileName: "tema-14-derecho-penal-general.pdf",
    title: "Tema 14: Derecho Penal - Concepto de Delito, Dolo y Penas",
    pages: [
      {
        title: "TEMA 14: DERECHO PENAL - PARTE GENERAL (PARTE 1)",
        sections: [
          {
            subtitle: "1. Concepto de Delito y Principios Penales (Art. 10 del Código Penal)",
            content: [
              "Son delitos las acciones y omisiones dolosas o imprudentes penadas por la ley.",
              "Principio de Legalidad Penal (Art. 1 CP): No será castigada ninguna acción ni omisión que no esté prevista",
              "como delito por ley anterior a su perpetración (nullum crimen, nulla poena sine lege).",
              "Formas de culpabilidad: Dolo (conciencia y voluntad de realizar el tipo objetivo) e Imprudencia (infracción",
              "del deber objetivo de cuidado, clasificada en imprudencia grave y menos grave)."
            ]
          },
          {
            subtitle: "2. Causas de Exención de la Responsabilidad Criminal (Artículos 19 y 20 CP)",
            content: [
              "Minoría de edad (Art. 19): Los menores de dieciocho años no son responsables criminalmente con arreglo al CP,",
              "aplicándose la Ley Orgánica reguladora de la responsabilidad penal de los menores (LORPM 5/2000).",
              "Anomalía o alteración psíquica e intoxicación plena (Art. 20.1 y 20.2): Excluyen la imputabilidad.",
              "Legítima defensa (Art. 20.4): Requiere agresión ilegítima, necesidad racional del medio empleado",
              "para impedirla o repelerla, y falta de provocación suficiente por parte del defensor.",
              "Estado de necesidad (Art. 20.5): El mal causado no debe ser mayor que el que se pretende evitar.",
              "Cumplimiento de un deber o ejercicio legítimo de un derecho, oficio o cargo (Art. 20.7)."
            ]
          }
        ]
      },
      {
        title: "TEMA 14: DERECHO PENAL - PARTE GENERAL (PARTE 2)",
        sections: [
          {
            subtitle: "3. Circunstancias Modificativas: Atenuantes y Agravantes (Arts. 21 y 22 CP)",
            content: [
              "Circunstancias Atenuantes (Art. 21): Confesión de la infracción a las autoridades antes de conocer el",
              "procedimiento, reparación del daño a la víctima, y dilaciones indebidas y extraordinarias en la tramitación.",
              "Circunstancias Agravantes (Art. 22): Alevosía (empleo de medios que aseguran la ejecución sin riesgo para el autor),",
              "ejecutar el hecho mediante disfraz o con abuso de superioridad, precio, recompensa o promesa,",
              "motivos discriminatorios (odio/racismo/ideología), ensañamiento (aumentar deliberadamente el dolor) y reincidencia."
            ]
          },
          {
            subtitle: "4. Clasificación de las Penas (Arts. 32 y 33 CP)",
            content: [
              "Por su naturaleza y duración las penas se clasifican en graves, menos graves y leves.",
              "Penas graves: Prisión permanente revisable, prisión superior a 5 años, inhabilitaciones absolutas.",
              "Penas menos graves: Prisión de 3 meses a 5 años, privación del permiso de conducir de 1 a 8 años,",
              "trabajos en beneficio de la comunidad de 31 a 180 días.",
              "Penas leves: Privación del permiso de conducir de 3 meses a 1 año, localización permanente de 1 día a 3 meses,",
              "multa de hasta 3 meses."
            ]
          }
        ]
      }
    ]
  }
];

async function generateAndUpload() {
  console.log("Iniciando generación de PDFs para Guardia Civil...");

  for (const topic of topics) {
    const doc = await PDFDocument.create();
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);

    for (const pageData of topic.pages) {
      const page = doc.addPage([595, 842]); // A4
      const { height, width } = page.getSize();

      // Top decorative bar (Guardia Civil green style)
      page.drawRectangle({
        x: 0,
        y: height - 12,
        width,
        height: 12,
        color: rgb(0.1, 0.45, 0.25)
      });

      // Header Tag
      page.drawText("ACADEMIA PROXUS - OPOSICIONES GUARDIA CIVIL", {
        x: 40,
        y: height - 35,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.45, 0.25)
      });

      // Page Title
      page.drawText(pageData.title, {
        x: 40,
        y: height - 65,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25)
      });

      // Divider line
      page.drawLine({
        start: { x: 40, y: height - 78 },
        end: { x: width - 40, y: height - 78 },
        thickness: 1.5,
        color: rgb(0.8, 0.85, 0.9)
      });

      let currentY = height - 105;

      for (const section of pageData.sections) {
        // Section header badge background
        page.drawRectangle({
          x: 40,
          y: currentY - 5,
          width: width - 80,
          height: 22,
          color: rgb(0.93, 0.96, 0.94)
        });

        page.drawText(section.subtitle, {
          x: 48,
          y: currentY + 2,
          size: 11,
          font: fontBold,
          color: rgb(0.08, 0.35, 0.2)
        });

        currentY -= 28;

        for (const line of section.content) {
          page.drawText(line, {
            x: 48,
            y: currentY,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.2, 0.25, 0.35)
          });
          currentY -= 15;
        }

        currentY -= 15;
      }

      // Footer
      page.drawLine({
        start: { x: 40, y: 45 },
        end: { x: width - 40, y: 45 },
        thickness: 0.8,
        color: rgb(0.85, 0.88, 0.92)
      });

      page.drawText("Material Oficial de Preparación - Proxus AI Academic Tutor", {
        x: 40,
        y: 30,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.65)
      });

      page.drawText("Página Documento Oficial", {
        x: width - 150,
        y: 30,
        size: 8,
        font: fontMono,
        color: rgb(0.5, 0.55, 0.65)
      });
    }

    const pdfBytes = await doc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    console.log(`Subiendo material: ${topic.title}...`);

    const response = await fetch("http://localhost:3000/api/materials/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: topic.fileName,
        title: topic.title,
        contentBase64: base64
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Error al subir ${topic.fileName}:`, errText);
    } else {
      const data = await response.json();
      console.log(`✓ Material subido con éxito: ${topic.fileName} (ID: ${data.id})`);
    }
  }

  console.log("¡Todos los materiales de la Guardia Civil han sido generados y subidos!");
}

void generateAndUpload();
