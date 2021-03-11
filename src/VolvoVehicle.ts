import VolvoOnCall from "./VolvoOnCall";


export type VolvoVehicleRelation = {
    vehicleId: string;
    status: "Verified" | string;
    customerVehicleRelationId: number;
}
type VolvoVehicleStatusHeaterTimer = {
    time: string;
    state: boolean;
};
type VolvoVehicleStatus = {
    averageFuelConsumption: number;
    averageFuelConsumptionTimestamp: string;
    averageSpeed: number;
    averageSpeedTimestamp: string;
    brakeFluid: "Normal" | string;
    brakeFluidTimestamp: string;
    bulbFailures: any[];
    bulbFailuresTimestamp: string;
    carLocked: boolean;
    carLockedTimestamp: string;
    distanceToEmpty: number;
    distanceToEmptyTimestamp: string;
    doors: {
        tailgateOpen: boolean;
        rearRightDoorOpen: boolean;
        rearLeftDoorOpen: boolean;
        frontRightDoorOpen: boolean;
        frontLeftDoorOpen: boolean;
        hoodOpen: boolean;
        timestamp: string;
    };
    fuelAmount: number;
    fuelAmountLevel: number;
    fuelAmountLevelTimestamp: string;
    fuelAmountTimestamp: string;
    heater: {
        timestamp: string;
        [key: string]: VolvoVehicleStatusHeaterTimer | any;
    };
    odometer: number;
    odometerTimestamp: string;
    serviceWarningStatus: "TimeExceeded" | string;
    serviceWarningStatusTimestamp: string;
    theftAlarm: {
        longitude: number;
        latitude: number;
        timestamp: string;
    };
    timeFullyAccessibleUntil: string;
    timePartiallyAccessibleUntil: string;
    tripMeter1: number;
    tripMeter1Timestamp: string;
    tripMeter2: number;
    tripMeter2Timestamp: string;
    washerFluidLevel: "Normal" | string;
    washerFluidLevelTimestamp: string;
    windows: {
        frontLeftWindowOpen: boolean;
        frontRightWindowOpen: boolean;
        rearRightWindowOpen: boolean;
        rearLeftWindowOpen: boolean;
        timestamp: string;
    };
    [key: string]: any;
};
type VolvoVehicleAttributes = {
    engineCode: string,
    exteriorCode: string,
    interiorCode: string,
    tyreDimensionCode: string,
    tyreInflationPressureLightCode: string,
    tyreInflationPressureHeavyCode: string,
    gearboxCode: string,
    fuelType: "Diesel" | string,
    fuelTankVolume: number,
    grossWeight: number,
    modelYear: number,
    vehicleType: string,
    vehicleTypeCode: string,
    numberOfDoors: number,
    country: {
        iso2: string
    },
    registrationNumber: string,
    carLocatorDistance: number,
    honkAndBlinkDistance: number,
    bCallAssistanceNumber: string,
    carLocatorSupported: boolean,
    honkAndBlinkSupported: boolean,
    honkAndBlinkVersionsSupported: [
        string
    ],
    remoteHeaterSupported: boolean,
    unlockSupported: boolean,
    lockSupported: boolean,
    journalLogSupported: boolean,
    assistanceCallSupported: boolean,
    unlockTimeFrame: number,
    verificationTimeFrame: number,
    timeFullyAccessible: number,
    timePartiallyAccessible: number,
    subscriptionType: string,
    subscriptionStartDate: string,
    subscriptionEndDate: string,
    serverVersion: string,
    VIN: string,
    journalLogEnabled: boolean,
    highVoltageBatterySupported: boolean,
    maxActiveDelayChargingLocations: null,
    preclimatizationSupported: boolean,
    sendPOIToVehicleVersionsSupported: any[],
    climatizationCalendarVersionsSupported: any[],
    climatizationCalendarMaxTimers: number,
    vehiclePlatform: string,
    vin: string,
    overrideDelayChargingSupported: boolean,
    engineStartSupported: boolean,
    "status.parkedIndoor.supported": boolean;
    [key: string]: any;
};
type VehicleServiceOperation = {
    status: "Successful" | "Started" | "MessageDelivered" | "Queued" | "Failed" | string;
    statusTimestamp: string;
    startTime: string;
    serviceType: "Dashboard" | string;
    failureReason: any | null;
    service: string;
    vehicleId: string;
    customerServiceId: string;
}

const sleep = (timeout: number) => new Promise(resolve => setTimeout(resolve, 1000 * timeout));

export default class VolvoVehicle {
    public onCall: VolvoOnCall;
    public relationId: number;
    public id: string;
    public status: "Verified" | string;
    public vehicleStatus: VolvoVehicleStatus | null;
    public vehicleAttributes: VolvoVehicleAttributes | null;
    public currentUpdateOperation: Promise<VehicleServiceOperation> | null;

    constructor (onCall: VolvoOnCall, data: VolvoVehicleRelation) {
        this.onCall = onCall;
        this.relationId = data.customerVehicleRelationId;
        this.id = data.vehicleId;
        this.status = data.status;
        this.vehicleStatus = null;
        this.vehicleAttributes = null;
        this.currentUpdateOperation = null;
    }

    /**
     * Gets this vehicle's status
     * @returns {Promise<VolvoVehicleStatus | null>}
     */
    public async getStatus () {
        return this.onCall.rest.request(
            `vehicles/${this.id}/status`,
            {
                method: "GET"
            }
        )
            .then(data => {
                this.vehicleStatus = data;
                return this.vehicleStatus;
            });
    }

    /**
     * Gets this vehicle's attributes
     * @returns {Promise<VolvoVehicleAttributes | null>}
     */
    public async getAttributes () {
        return this.onCall.rest.request(
            `vehicles/${this.id}/attributes`,
            {
                method: "GET"
            }
        )
            .then(data => {
                this.vehicleAttributes = data;
                return this.vehicleAttributes;
            });
    }

    /**
     * Gets the service status of an update operation (after calling /updatestatus on the vehicle in question)
     * @param {string} service
     * @returns {Promise<VehicleServiceOperation>}
     */
    public getServiceOperation (service: string): Promise<VehicleServiceOperation> {
        return this.onCall.rest.request(
            `vehicles/${this.id}/services/${service}`,
            {
                method: "GET"
            }
        );
    }

    public updateVehicleStatus (): Promise<VehicleServiceOperation> {
        // In case we have a pending update operation, we just return that instead :^)
        if (this.currentUpdateOperation) {
            return this.currentUpdateOperation;
        }

        this.currentUpdateOperation = (async () => {
            const sentServiceOperation = await this.onCall.rest.request(
                `vehicles/${this.id}/updatestatus`,
                {
                    method: "POST",
                    json: {}
                }
            ) as VehicleServiceOperation;

            const check = async (): Promise<VehicleServiceOperation> => {
                const operationErrorMessage = `Operation service id: ${sentServiceOperation.customerServiceId}.`;
                const operationStatus = await this.getServiceOperation(sentServiceOperation.customerServiceId);

                if (operationStatus.status === "Failed") {
                    throw new Error(`Failed to run operation! ${operationErrorMessage}`);
                } else if (operationStatus.status === "Queued" || operationStatus.status === "Started") {
                    await sleep(5);
                    return check();
                } else if (operationStatus.status === "MessageDelivered" || operationStatus.status === "Successful") {
                    // Finished!
                    return operationStatus;
                } else {
                    throw new Error(`Unexpected service operation status: ${operationStatus.status}. ${operationErrorMessage}`);
                }
            };

            return check();
        })()
            .catch((error: Error) => {
                this.currentUpdateOperation = null;
                throw error;
            });

        return this.currentUpdateOperation;
    }

    /**
     * Updates both attributes and status for the vehicle and returns it. Does not send an update request, just
     * fetches the currently available data from the server.
     * @returns {Promise<{attributes: VolvoVehicleAttributes | null, status: VolvoVehicleStatus | null}>}
     */
    public async updateInfo () {
        await this.getAttributes();
        await this.getStatus();

        return {
            status: this.vehicleStatus,
            attributes: this.vehicleAttributes
        };
    }
}
