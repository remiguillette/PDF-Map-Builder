export type PreloadedPdf = {
  id: string;
  name: string;
  path: string;
};

const preloadedPdfs: PreloadedPdf[] = [
  {
    id: "c1-retail-cafe",
    name: "C1 Retail Cafe",
    path: "/pdfs/C1.pdf",
  },
];

export default preloadedPdfs;
