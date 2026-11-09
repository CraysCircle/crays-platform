/** Existing reviewed stock, illustrative only; never evidence of the fictional venue. */
const images=["/assets/crays-demo-v1/media/832a55d02e73d5ef177353b7c52ff45ade68bd793d01bf70c47c2e3498b08bf3.jpg", "/assets/crays-demo-v1/media/cd26eb6dd5ddd2da44608010735e225d650899d2a07221f3f50b882c0564e58a.jpg", "/assets/crays-demo-v1/media/35d138fea9c455053127b99cca1ab4d4477ff00220bb0bd5ae8d19b8627459da.jpg"];
export function spotServiceIllustration(id:string){const match=/-service-([123])$/.exec(id);return match?images[Number(match[1])-1]:undefined;}
