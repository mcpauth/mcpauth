export type Where = {
  field: string;
  value: any;
};

export interface GenericAdapter {
  create(args: { model: string; data: any }): Promise<any>;
  findOne(args: { model: string; where: Where[]; include?: any }): Promise<any | null>;
  update(args: { model: string; where: Where[]; data: any }): Promise<any>;
  delete(args: { model: string; where: Where[] }): Promise<void>;
  deleteMany(args: { model: string; where: Where[] }): Promise<number>;
}
