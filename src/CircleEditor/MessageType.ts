export interface responseModel{
    command: string;
    type: string;
    offset: number;
    length: number;
    total: number;
    responseArray: Uint8Array;
}

export interface requestMessage{
    command: string;
    type: string;
    data: any;
}

export interface customInfoMessage{
    command: string,
    data: any; //string인가????
}

export interface responseModelPath{
    command: string,
    type: string,
    value: string
}

export interface responseFileRequest{
    command: string,
    response: string,
}