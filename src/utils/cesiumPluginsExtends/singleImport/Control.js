import BaseExtends from "./Base";
import { Base, Control } from "../libs";

class GontrolExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: Base,
      extendsCom: Control,
      extendsComName: "control",
    });
  }
}

export { GontrolExtends as Control };
