export interface Chapter {
    id: string;
    name: string;
    description?: string;
    regionId?: string;
}

export interface Region {
    id: string;
    name: string;
}