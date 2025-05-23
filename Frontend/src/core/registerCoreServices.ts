import {ALocalizationService, createRegistrationEntry} from "@tcpos/common-core";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
    ABaseApiController,
    ACacheLogic,
    ANextBOConfigService,
    AUserLogic,
    CacheLogic,
    checkResolverNames,
    NextBOHooksAfter,
    NextBOHooksBefore,
    NextBOPublicRegistrationContainer,
    getPluginSortedList,
    loadPlugins,
    LocalizationService,
    pluginInfoList,
    pluginSortedListMap,
    setLoadingStateCompleted,
    store,
    UserLogic
} from "@tcpos/backoffice-core";
import type { PluginInfo } from "@tcpos/backoffice-core";
import {
    CustomerDataController,
    GroupPermissionDataController,
    OrderDataController,
    OrderDetailDataController,
    PermissionDataController,
    PermissionsCtesDataController,
    ProductDataController,
    UserPermissionDataController
} from "./dataControllers";
import {
    CustomerObjectController,
} from "./objectControllers";
import {basePluginListRegistration} from "../plugins/basePlugins/basePluginListRegistration";
import { ProductObjectController } from "./objectControllers/ProductObjectController";
import { OrderObjectController } from "./objectControllers/OrderObjectController";
import { CommonApiController } from "./services/CommonApiController";
import { UserDataController } from "./dataControllers/UserDataController";
import { UserGroupDataController } from "./dataControllers/UserGroupDataController";
import { TaxDataController } from "./dataControllers/TaxDataController";
import { TaxObjectController } from "./objectControllers/TaxObjectController";
import { GroupDataController } from "./dataControllers/GroupDataController";
import { GroupObjectController } from "./objectControllers/GroupObjectController";
import { PermissionsOperatorDataController } from "./dataControllers/PermissionsOperatorDataController";

/**
 * Registration of core services:
 * - {@link LocalizationService}
 * - {@link CacheLogic}, which satisfies {@link ACacheLogic}
 * - {@link UserLogic}, which satisfies {@link AUserLogic}
 * - {@link CommonApiController}, which satisfies {@link ABaseApiController}
 * - Data controllers (that map database tables), extending {@link CommonDataController}
 * - Object controllers (one for each application page), extending {@link CommonObjectController}
 *
 * This function uses methods provided by the {@link NextBOPublicRegistrationContainer} class.
 */
export function registerCoreServices() {
    NextBOPublicRegistrationContainer.register(ALocalizationService, LocalizationService);

    NextBOPublicRegistrationContainer.register(ACacheLogic, CacheLogic);

    //NextBOPublicRegistrationContainer.registerIHistory(history);

    NextBOPublicRegistrationContainer.register(AUserLogic, UserLogic);

    NextBOPublicRegistrationContainer.register(ABaseApiController, CommonApiController);

    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Customer", controller: CustomerDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Tax", controller: TaxDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Product", controller: ProductDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Order", controller: OrderDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "OrderDetail", controller: OrderDetailDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "User", controller: UserDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "UserGroup", controller: UserGroupDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Group", controller: GroupDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "Permission", controller: PermissionDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "PermissionsCtes", controller: PermissionsCtesDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "UserPermission", controller: UserPermissionDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "GroupPermission", controller: GroupPermissionDataController}));
    NextBOPublicRegistrationContainer.registerEntry("dataControllers", createRegistrationEntry({
        _registrationName: "PermissionsOperator", controller: PermissionsOperatorDataController}));
    
    NextBOPublicRegistrationContainer.registerEntry("objectControllers", createRegistrationEntry(
        {_registrationName: "tax", controller: TaxObjectController}));
    NextBOPublicRegistrationContainer.registerEntry("objectControllers", createRegistrationEntry(
        {_registrationName: "customer", controller: CustomerObjectController}));
    NextBOPublicRegistrationContainer.registerEntry("objectControllers", createRegistrationEntry(
        {_registrationName: "product", controller: ProductObjectController}));
    NextBOPublicRegistrationContainer.registerEntry("objectControllers", createRegistrationEntry(
        {_registrationName: "group", controller: GroupObjectController}));
    NextBOPublicRegistrationContainer.registerEntry("objectControllers", createRegistrationEntry(
        {_registrationName: "order", controller: OrderObjectController}));

    store.dispatch(setLoadingStateCompleted({step: 'registrations'}));

}

export const activatePlugins = (): void  => {
    const fetchPlugins = async () => {
        const pluginList = await NextBOPublicRegistrationContainer.resolve(ANextBOConfigService).getPluginList();
        pluginList.forEach(p => {
            if (basePluginListRegistration[p]) {
                basePluginListRegistration[p]();
            }
        });
        store.dispatch(loadPlugins(pluginList));
        store.dispatch(setLoadingStateCompleted({step: 'pluginRegistrations'}));
    };

    fetchPlugins();

};

/**
 * TODO: the weakSorting settings must be moved to a config file
 * Usage:
 * [
 *  {
 *      responder: (one of TCHooksBefore or TCHooksAfter values, or "*"),
 *      pluginList: [ordered plugin names list for the related responder]
 *  }
 * ]
 */
const weakSorting: any[] = [];

/**
 * await for all content loaded to build plugin map
 */
window.addEventListener("PluginLoaded", () => {
    // "Before" responders
    for (const hookType of Object.keys(NextBOHooksBefore)) {
        const currentHookType: string = NextBOHooksBefore[hookType as keyof typeof NextBOHooksBefore];
        // Extracts the list of the plugins associated to this responder
        const pluginResponderList = pluginInfoList.filter((el) =>
            el.responder === currentHookType);
        if (pluginResponderList.length > 0) {
            // Verifies that there aren't plugins with empty name or different plugins with the same name
            if (checkResolverNames(pluginResponderList, currentHookType)) {
                // Defines the list to be used to manage dependencies
                let responderWeaklySortedList: PluginInfo[] = [];
                // Checks if a weak sorting is configured for this responder
                const weakSortingResponder = weakSorting.find(
                    (el) => el.responder.toString() === currentHookType);
                if (weakSortingResponder) {
                    // If there is a quick sorting setting, checks if each element in "pluginList" field is a
                    // valid element and, if so, pushes it in the responderWeaklySortedList
                    for (const nextPlugin of weakSortingResponder.pluginList) {
                        const currentPlugin = pluginResponderList.find((el) => el.pluginName === nextPlugin);
                        if (currentPlugin) {
                            responderWeaklySortedList.push(currentPlugin);
                        }
                    }
                    // Adds to responderWeaklySortedList the eventual plugins not yet added
                    for (const nextMissingPlugin of pluginResponderList) {
                        if (!responderWeaklySortedList.find((el) =>
                            el.pluginName === nextMissingPlugin.pluginName)) {
                            responderWeaklySortedList.push(nextMissingPlugin);
                        }
                    }
                    responderWeaklySortedList.reverse();
                } else {
                    responderWeaklySortedList = pluginResponderList;
                }
                const pluginSortedList = getPluginSortedList(responderWeaklySortedList);
                pluginSortedListMap.set(currentHookType, pluginSortedList);
            }
        }
    }

    // "After" responders
    for (const hookType of Object.keys(NextBOHooksAfter)) {
        const currentHookType = NextBOHooksAfter[hookType as keyof typeof NextBOHooksAfter];
        const pluginResponderList = pluginInfoList.filter((el) => el.responder === currentHookType);
        if (pluginResponderList.length > 0) {
            if (checkResolverNames(pluginResponderList, currentHookType)) {
                pluginResponderList.reverse();
                const pluginSortedList = getPluginSortedList(pluginResponderList);
                pluginSortedListMap.set(currentHookType, pluginSortedList);
            }
        }
    }

    store.dispatch(setLoadingStateCompleted({step: 'pluginHookRegistrations'}));

});
