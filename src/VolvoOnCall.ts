import RESTController from "./controllers/RESTController";
import VolvoVehicle from "./VolvoVehicle";


export type LoginOptions = {
    email: string;
    password: string;
}
type VolvoOnCallAccount = {
    username: string;
    firstName: string;
    lastName: string;
    accountId: string;
    accountVehicleRelations: number[];
};
type VolvoVehicleRelationData = {
    account: string;
    accountId: string;
    vehicle: string;
    accountVehicleRelation: string;
    vehicleId: string;
    username: string;
    status: "Verified" | string;
    customerVehicleRelationId: number;
}


export default class VolvoOnCall {
    public rest: RESTController;
    public account: VolvoOnCallAccount | null;

    constructor (region: "eu" | string = "eu") {
        this.rest = new RESTController(this, region);
        this.account = null;
    }

    /**
     * Fetch data of a vehicle based on its relation id
     * @param {number} relationId
     * @returns {Promise<VolvoVehicleRelationData>}
     */
    public getVehicleDataByRelationId (relationId: number): Promise<VolvoVehicleRelationData> {
        return this.rest.request(
            `vehicle-account-relations/${relationId}`,
            {
                method: "GET"
            }
        );
    }

    /**
     * Gets a VolvoVehicle instance from the relation id of the vehicle
     * @param {number} relationId
     * @returns {Promise<VolvoVehicle>}
     */
    public getVehicleByRelation (relationId: number): Promise<VolvoVehicle> {
        return this.getVehicleDataByRelationId(relationId)
            .then(async data => {
                const vehicle = new VolvoVehicle(this, data);
                await vehicle.updateInfo();

                return vehicle;
            });
    }

    /**
     * A "mask" function for just verifying that the authorization stuff works, it will throw if not
     * @param {LoginOptions} options
     * @returns {Promise<VolvoOnCallAccount>}
     */
    public async login (options: LoginOptions): Promise<VolvoOnCallAccount> {
        this.rest.authKey = this.rest.convertToBase64(`${options.email}:${options.password}`);

        return this.rest.request(
            "customeraccounts",
            {
                method: "GET"
            }
        )
            .then(response => {
                this.account = response;
                this.account!.accountVehicleRelations = response.accountVehicleRelations.map(
                    (relationUrl: string) => parseInt(relationUrl.match(/vehicle-account-relations\/(.*)/)?.[1] ?? "")
                );
                return this.account!;
            });
    }
}
