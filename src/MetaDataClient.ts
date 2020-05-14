import {AxiosResponse} from "axios";
import urlSearchParams from "@ungap/url-search-params";
import {APIErrors} from "./resources/APIErrors";
import {APIHTTPErrorCodes} from "./resources/APIHTTPErrorCodes";
import {APITasks} from "./resources/APITasks";
import {APIAbortController} from "./APIAbortController";
import {FSIServerClientInterface} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IStringAnyMap, IStringStringMap} from "./FSIServerClientUtils";
import {TaskController} from "./TaskController";
import {FSIServerClient, ImportStatus} from "./index";
import {IHTTPOptions} from "./utils/IHTTPOptions";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {LogLevel} from "./LogLevel";
import {IListEntry} from "./ListServer";

const URLSearchParams = urlSearchParams;

export interface IMetaData {
    "general"?: {
        width: number,
        height: number,
        size: string,
        source: string
        alpha: boolean,
        alphachannels: [string],
        icc?: string, // name of the ICC profile if any
        importstatus?: ImportStatus,
        importtimestamp?: number, // unix time stamp
        levels?: string,
        lastmodified?: string,

    },
    "iptc"?: {
        "By-line Title"?: string,
        "By-line"?: string,
        "Caption"?: string,
        "Category"?: string,
        "City"?: string,
        "Copyright Notice"?: string,
        "Country Code"?: string,
        "Country/Primary Location"?: string,
        "Credit"?: string,
        "Date Created"?: string,
        "Directory Version"?: string,
        "FSI Encoding"?: string,
        "FSI Extra"?: string,
        "FSI SceneSets"?: string,
        "FSI Search Data"?: string,
        "FSI Tiles X"?: string,
        "FSI Tiles Y"?: string,
        "Headline"?: string,
        "Keywords"?: string,
        "Object Name"?: string,
        "Original Transmission Reference"?: string,
        "Originating Program"?: string,
        "Province/State"?: string,
        "Release Date"?: string,
        "Release Time"?: string,
        "Source"?: string,
        "Special Instructions"?: string,
        "Supplemental Category(s)"?: string,
        "Time Created"?: string,
        "Urgency"?: string,
        "Writer"?: string
    },
    "exif"?: {
        "Aperture"?: string,
        "Bits per Sample"?: string,
        "Brightness"?: string,
        "CFA pattern"?: string,
        "Color components"?: string,
        "Color space information"?: string,
        "Compressed Bits per Pixel"?: string,
        "Compression"?: string,
        "Contrast"?: string,
        "Copyright holder"?: string,
        "Custom image processing"?: string,
        "Date and time of digital data generation"?: string,
        "Date and time of original data generation"?: string,
        "Device setting description"?: string,
        "Digital zoom ratio"?: string,
        "Exif IFD Pointer"?: string,
        "Exif Image Height"?: string,
        "Exif Image Width"?: string,
        "Exif version"?: string,
        "Exposure bias"?: string,
        "Exposure index"?: string,
        "Exposure mode"?: string,
        "Exposure program"?: string,
        "Exposure time"?: string,
        "F number"?: string,
        "File change date and time"?: string,
        "File source"?: string,
        "Flash energy"?: string,
        "Flash"?: string,
        "Flashpix Version"?: string,
        "Focal length in 35 mm film"?: string,
        "Focal length in mm"?: string,
        "Gain control"?: string,
        "GPS Altitude Reference"?: string,
        "GPS Altitude"?: string,
        "GPS Date Stamp"?: string,
        "GPS Differential"?: string,
        "GPS Dilution of Precision"?: string,
        "GPS Image Direction Reference"?: string,
        "GPS Image Direction"?: string,
        "GPS Latitude Reference"?: string,
        "GPS Latitude"?: string,
        "GPS Longitude Reference"?: string,
        "GPS Longitude"?: string,
        "GPS Map Datum"?: string,
        "GPS Measure Mode"?: string,
        "GPS Satellites"?: string,
        "GPS Speed Reference"?: string,
        "GPS Speed"?: string,
        "GPS Status"?: string,
        "GPS Time Stamp"?: string,
        "GPS Track Reference"?: string,
        "GPS Track"?: string,
        "GPSInfo IFD Pointer"?: string,
        "Image Height"?: string,
        "Image title"?: string,
        "Image Width"?: string,
        "Interop IFD Pointer"?: string,
        "Interoperability Index"?: string,
        "Interoperability Version"?: string,
        "ISO speed rating"?: string,
        "Light source"?: string,
        "Manufacturer notes"?: string,
        "Manufacturer of image input equipment"?: string,
        "MarkerNote IFD Pointer"?: string,
        "Maximum lens aperture"?: string,
        "Metering mode"?: string,
        "Model of image input equipment"?: string,
        "Optoelectric conversion factor"?: string,
        "Person who created the image"?: string,
        "Photometric Interpretation"?: string,
        "Pixels (height) per focal unit"?: string,
        "Pixels (width) per focal unit"?: string,
        "Planar Configuration"?: string,
        "Primary Chromaticities"?: string,
        "PrintIM"?: string,
        "Processing Software"?: string,
        "Rating Percent"?: string,
        "Rating"?: string,
        "Reference Black White"?: string,
        "Related Image File Format"?: string,
        "Related Image Length"?: string,
        "Related Image Width"?: string,
        "Related Sound File"?: string,
        "Resolution Unit"?: string,
        "Samples per Pixel"?: string,
        "Saturation"?: string,
        "Scene capture type"?: string,
        "Scene type"?: string,
        "Sensing method"?: string,
        "Sharpness"?: string,
        "Shutter speed"?: string,
        "Software used"?: string,
        "Spatial frequency response"?: string,
        "Spectral sensitivity"?: string,
        "Sub Sec Time Digitized"?: string,
        "Sub Sec Time Original"?: string,
        "Sub Sec Time"?: string,
        "Subject distance range"?: string,
        "Subject distance"?: string,
        "Subject location"?: string,
        "The orientation of the image"?: string,
        "Unique image ID"?: string,
        "Unit for focal plane resolution"?: string,
        "User comments"?: string,
        "White balance"?: string,
        "White Point"?: string,
        "X Resolution"?: string,
        "Y Cb Cr Coefficients"?: string,
        "Y Cb Cr Positioning"?: string,
        "Y Resolution"?: string
    },
    fsi?: IStringStringMap,
    xmp?: IStringStringMap
}

const MetaDataNumberDefaults: { [key: string]: { [key: string]: number; } } = {
    "directory": {
        "lastmodified": 0,
    },
    "file": {
        "height": 0,
        "importstatus": 0,
        "importtimestamp": 0,
        "lastmodified": 0,
        "levels": 0,
        "size": 0,
        "width": 0
    }
};

const MetaDataBooleanDefaults: { [key: string]: { [key: string]: boolean; } } = {
    "directory": {},
    "file": {
        "alpha": false
    }
};


export interface IMetaDataOptions extends IHTTPOptions {
    template?: string,
    renderer?: string,
    headers?: string
}


export class MetaDataClient {

    private readonly baseURL: string;
    private readonly client: FSIServerClient;
    private readonly com: FSIServerClientInterface;

    constructor(private readonly classInit: IAPIClassInit, private taskController: TaskController) {
        this.client = classInit.client;
        this.com = classInit.com;

        this.baseURL = this.client.getServerBaseQueryPath();
    }

    public static GET_META_QUERY(data: IMetaData, cmd: string = "saveMetaData"): URLSearchParams {
        const q = new URLSearchParams("cmd=" + encodeURIComponent(cmd));

        const emptyValues: boolean = (cmd.toLowerCase() !== "savemetadata");

        const rawData: { [key: string]: any } = data;
        const keys = Object.keys(data);
        const firstKey = keys[0];
        if (firstKey) {


            if (typeof (rawData[firstKey]) === "object") { // data contains objects

                for (const key of keys) {
                    if (typeof (rawData[key]) === "object") {
                        for (const nam of Object.keys(rawData[key])) {
                            if (emptyValues || typeof(rawData[key][nam]) === "string") {
                                const val: string = (emptyValues)?"":rawData[key][nam];
                                q.set(key + "." + nam, val);
                            }
                        }
                    }
                }
            } else { // data contains strings
                for (const key of keys) {
                    if (emptyValues || typeof(rawData[key]) === "string") {
                        const val: string = (emptyValues) ? "" : rawData[key];
                        q.set(key, val);
                    }
                }
            }
        }

        return q;
    }

    public get(path: string, options: IMetaDataOptions = {}): Promise<IMetaData> {

        if (APIAbortController.IS_ABORTED(options.abortController)) {
            return this.com.getAbortPromise();
        }


        path = FSIServerClientUtils.NORMALIZE_FILE_PATH(path);

        this.taskController.setCurrentTask(LogLevel.debug, APITasks.getMetaData, [path]);

        const q = new URLSearchParams("type=info");
        q.set("tpl", options.template || "interface_metadata.json");
        q.set("renderer", options.renderer || "noredirect");
        q.set("headers", options.headers || "webinterface");
        q.set("source", path);

        const url = this.baseURL + q.toString();

        return this.com.iAxios.get(
            url,
            this.com.getAxiosRequestConfig(options)
        )
            .then(response => {

                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (response.status === 200) {
                    return response.data;
                } else {
                    this.throwHTTPError(response);
                }
            })
            .then(meta => {
                APIAbortController.THROW_IF_ABORTED(options.abortController);

                if (typeof (meta) === "object") {

                    if (typeof (meta.general) === "object") {

                        const type: string = (meta.general.size === undefined) ? "directory" : "file";

                        for (const o of Object.keys(MetaDataNumberDefaults[type])) {
                            if (meta.general[o] === undefined) {
                                meta.general[o] = MetaDataNumberDefaults[type][o];
                            } else {
                                meta.general[o] = parseInt(meta.general[o], 10);
                            }
                        }

                        for (const o of Object.keys(MetaDataBooleanDefaults[type])) {
                            if (meta.general[o] === undefined) {
                                meta.general[o] = MetaDataBooleanDefaults[type][o];
                            } else {
                                meta.general[o] = (meta.general[o] === "true");
                            }
                        }
                    }


                    return meta;
                } else {
                    throw this.com.err.get(APIErrors.getMetaData, [path], APIErrors.invalidServerReply);
                }


            })
            .catch(error => {
                throw error;
            });
    }

    public setByFunction(entry: IListEntry, cmd: string = "saveMetaData", fnMeta: (entry: IListEntry) => Promise<IMetaData | null>,
                         options: IMetaDataOptions = {}): Promise<boolean> {

        const self = this;

        if (APIAbortController.IS_ABORTED(options.abortController)) {
            return this.com.getAbortPromise();
        }

        return new Promise((resolve, reject) => {
            fnMeta(entry)
                .then( md => {

                    APIAbortController.THROW_IF_ABORTED(options.abortController);

                    if (md !== null) {
                        const promise: Promise<boolean> = self.set(entry.path, entry.type, md, cmd, options);
                        return resolve(promise);
                    } else {
                        return resolve(FSIServerClientInterface.GET_TRUE_PROMISE());
                    }


                })
                .catch(err => {
                    reject(new Error(err.message));
                });
        });
    }


    public set(path: string, service: string, data: IMetaData, cmd: string = "saveMetaData", options: IMetaDataOptions = {}): Promise<boolean> {

        return this.setWithQuery(path, service, MetaDataClient.GET_META_QUERY(data, cmd), options);
    }

    public setWithQuery(path: string, service: string, query: URLSearchParams, options: IMetaDataOptions = {}): Promise<boolean> {

        if (APIAbortController.IS_ABORTED(options.abortController)) {
            return this.com.getAbortPromise();
        }

        path = FSIServerClientUtils.NORMALIZE_FILE_PATH(path);

        this.taskController.setCurrentTask(LogLevel.debug, APITasks.setMetaData, [service, path, query.toString()]);

        const url = this.client.getServicePath(service) + "/" + encodeURIComponent(path);

        return this.taskController.postJsonBoolean(
            url,
            query,
            {def: APIErrors.changeMetaData, content: [path]},
            null,
            options
        )
            .then(() => {
                return true;
            })
            .catch(error => {
                throw error;
            });
    }

    public delete(path: string, service: string, data: IMetaData, options: IMetaDataOptions = {}): Promise<boolean> {
        return this.set(path, service, data, "deleteMetaData", options);
    }

    public restore(path: string, service: string, data: IMetaData, options: IMetaDataOptions = {}): Promise<boolean> {
        return this.set(path, service, data, "restoreMetaData", options);
    }

    private throwHTTPError(response: AxiosResponse): void {
        throw this.com.err.get(APIErrors.httpError,
            [APIHTTPErrorCodes.GET_CODE(response.status), response.config.url]);
    }
}
