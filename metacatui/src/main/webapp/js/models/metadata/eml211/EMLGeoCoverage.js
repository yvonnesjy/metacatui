/* global define */
define(['jquery', 'underscore', 'backbone', 'models/DataONEObject'],
    function ($, _, Backbone, DataONEObject) {

        var EMLGeoCoverage = Backbone.Model.extend({

            defaults: {
                objectXML: null,
                objectDOM: null,
                parentModel: null,
                description: null,
                east: null,
                north: null,
                south: null,
                west: null
            },

            initialize: function (attributes) {
                if (attributes && attributes.objectDOM) this.set(this.parse(attributes.objectDOM));

                //specific attributes to listen to
                this.on("change:description " +
                    "change:east " +
                    "change:west " +
                    "change:south" +
                    "change:north",
                    this.trickleUpChange);
            },

            /*
             * Maps the lower-case EML node names (valid in HTML DOM) to the camel-cased EML node names (valid in EML).
             * Used during parse() and serialize()
             */
            nodeNameMap: function () {
                return {
                    "altitudemaximum": "altitudeMaximum",
                    "altitudeminimum": "altitudeMinimum",
                    "altitudeunits": "altitudeUnits",
                    "boundingaltitudes": "boundingAltitudes",
                    "boundingcoordinates": "boundingCoordinates",
                    "eastboundingcoordinate": "eastBoundingCoordinate",
                    "geographiccoverage": "geographicCoverage",
                    "geographicdescription": "geographicDescription",
                    "northboundingcoordinate": "northBoundingCoordinate",
                    "southboundingcoordinate": "southBoundingCoordinate",
                    "westboundingcoordinate": "westBoundingCoordinate"
                }
            },

            /** Based on this example serialization
            <geographicCoverage scope="document">
                <geographicDescription>Rhine-Main-Observatory</geographicDescription>
                <boundingCoordinates>
                    <westBoundingCoordinate>9.0005</westBoundingCoordinate>
                    <eastBoundingCoordinate>9.0005</eastBoundingCoordinate>
                    <northBoundingCoordinate>50.1600</northBoundingCoordinate>
                    <southBoundingCoordinate>50.1600</southBoundingCoordinate>
                </boundingCoordinates>
            </geographicCoverage>
             **/
            parse: function (objectDOM) {

                var modelJSON = {};

                if (!objectDOM) {
                    if (this.get("objectDOM"))
                        var objectDOM = this.get("objectDOM");
                    else
                        return {};
                }

                //Create a jQuery object of the DOM
                var $objectDOM = $(objectDOM);

                //Get the geographic description
                modelJSON.description = $objectDOM.children('geographicdescription').text();

                //Get the bounding coordinates
                var boundingCoordinates = $objectDOM.children('boundingcoordinates');
                if (boundingCoordinates) {
                    modelJSON.east = boundingCoordinates.children('eastboundingcoordinate').text().replace("+", "");
                    modelJSON.north = boundingCoordinates.children('northboundingcoordinate').text().replace("+", "");
                    modelJSON.south = boundingCoordinates.children('southboundingcoordinate').text().replace("+", "");
                    modelJSON.west = boundingCoordinates.children('westboundingcoordinate').text().replace("+", "");
                }

                return modelJSON;
            },

            serialize: function () {
                var objectDOM = this.updateDOM(),
                    xmlString = objectDOM.outerHTML;

                //Camel-case the XML
                xmlString = this.formatXML(xmlString);

                return xmlString;
            },

            /*
             * Makes a copy of the original XML DOM and updates it with the new values from the model.
             */
            updateDOM: function () {
                var objectDOM;

                if (!this.isValid()) {
                    return "";
                }

                if (this.get("objectDOM")) {
                    objectDOM = $(this.get("objectDOM").cloneNode(true));
                } else {
                    objectDOM = $(document.createElement("geographiccoverage"));
                }

                //If only one point is given, make sure both points are the same
                if ((this.get("north") && this.get("west")) && (!this.get("south") && !this.get("east"))) {
                    this.set("south", this.get("north"));
                    this.set("east", this.get("west"));
                }
                else if ((this.get("south") && this.get("east")) && (!this.get("north") && !this.get("west"))) {
                    this.set("north", this.get("south"));
                    this.set("west", this.get("east"));
                }

                // Description
                if (!objectDOM.children("geographicdescription").length)
                    objectDOM.append($(document.createElement("geographicdescription")).text(this.get("description")));
                else
                    objectDOM.children("geographicdescription").text(this.get("description"));

                // Create the bounding coordinates element
                var boundingCoordinates = objectDOM.find("boundingcoordinates");
                if (!boundingCoordinates.length) {
                    boundingCoordinates = document.createElement("boundingcoordinates");
                    objectDOM.append(boundingCoordinates);
                }

                //Empty out the coordinates first
                $(boundingCoordinates).empty();

                //Add the four coordinate values
                $(boundingCoordinates).append($(document.createElement("westboundingcoordinate")).text(this.get("west")),
                    $(document.createElement("eastboundingcoordinate")).text(this.get("east")),
                    $(document.createElement("northboundingcoordinate")).text(this.get("north")),
                    $(document.createElement("southboundingcoordinate")).text(this.get("south")));

                return objectDOM;
            },

            /**
            * Sometimes we'll need to add a space between error messages, but only if an 
            * error has already been triggered. Use addSpace to accomplish this.
            *
            * @function addSpace
            * @param {string} msg The string that will be appended
            * @param {bool} front A flag that when set will append the whitespace to the front of 'msg'
            * @return {string} The string that was passed in, 'msg', with whitespace appended
            */
            addSpace: function (msg, front = false) {
                if (msg) {
                    if (front) {
                        return (" " + msg);
                    }
                    return msg += " ";
                }
                return msg;
            },

            /**
            * Because the same error messages are used in a couple of different places, we centralize the strings 
            * and access here.
            *
            * @function getErrorMessage
            * @param {string} area Specifies the area that the error message belongs to.
            * Browse through the switch statement to find the one you need.
            * @return {string} The error message	
            */
            getErrorMessage: function (area) {
                switch (area) {
                    case "north":
                        return "The Northwest latitude must be between -90 and 90.";
                        break;
                    case "east":
                        return "The Southeast longitude must be between -180 and 180.";
                        break;
                    case "south":
                        return "The Southeast latitude must be between -90 and 90.";
                        break;
                    case "west":
                        return "The Northwest longitude must be between -180 and 180.";
                        break;
                    case "missing":
                        return "Each coordinate must include a latitude AND longitude.";
                        break;
                    case "description":
                        return "Each location must have a description.";
                        break;
                    case "needPair":
                        return "Each location description must have at least one coordinate pair.";
                        break;
                    default:
                        return "";
                        break;
                }
            },

            /**
            * Generates an object that describes the current state of each latitude
            * and longitude box. The status includes whether there is a value and
            * if the value is valid. 
            *
            * @function getCoordinateStatus
            * @return {array} An array containing the current state of each coordinate box
            */
            getCoordinateStatus: function () {
                var north = this.get("north"),
                    east = this.get("east"),
                    south = this.get("south"),
                    west = this.get("west");

                return {
                    'north': {
                        isSet: typeof north !== "undefined" && north != null && north !== "",
                        isValid: this.validateCoordinate(north, -90, 90)
                    },
                    'east': {
                        isSet: typeof east !== "undefined" && east != null && east !== "",
                        isValid: this.validateCoordinate(east, -180, 180)
                    },
                    'south': {
                        isSet: typeof south !== "undefined" && south != null && south !== "",
                        isValid: this.validateCoordinate(south, -90, 90)
                    },
                    'west': {
                        isSet: typeof west !== "undefined" && west != null && west !== "",
                        isValid: this.validateCoordinate(west, -180, 180)
                    },
                }
            },

            /**
            * Checks the status object for conditions that warrant an error message to the user. This is called
            * during the validation processes (validate() and updateModel()) after the status object has been
            * created by getCoordinateStatus().
            *
            * @function generateStatusErrors
            * @param status The status object, holding the state of the coordinates
            * @return {string} Any errors that need to be displayed to the user
                */
            generateStatusErrors: function (status) {
                var errorMsg = "";

                // Northwest Latitude
                if (status.north.isSet && !status.north.isValid) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("north");
                }
                // Northwest Longitude	
                if (status.west.isSet && !status.west.isValid) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("west");
                }
                // Southeast Latitude
                if (status.south.isSet && !status.south.isValid) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("south");
                }
                // Southeast Longitude
                if (status.east.isSet && !status.east.isValid) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("east");
                }
                return errorMsg;

            },

            /** 
            * This grabs the various location elements and validates the user input. In the case of an error,
            * we append an error string (errMsg) so that we display all of the messages at the same time. This
            * validates the entire location row by adding extra checks for a description and for coordinate pairs
            *
            * @function validate
            * @return {string} The error messages that the user will see
            */
            validate: function () {
                var errorMsg = "";

                if (!this.get("description")) {
                    errorMsg += this.getErrorMessage("description");
                }

                var status = this.getCoordinateStatus();


                if (!this.checkForPairs(status)) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("needPair");
                }

                if (this.checkForMissing(status)) {
                    errorMsg = this.addSpace(errorMsg);
                    errorMsg += this.getErrorMessage("missing");
                }

                errorMsg += this.addSpace(this.generateStatusErrors(status), true);
                return errorMsg;
            },

            /**
             * Checks for any coordinates with missing counterparts.
             * 
             * @function checkForMissing
             * @param status The status of the coordinates
             * @return {bool} True if there are missing coordinates, false otherwise
             */
            checkForMissing: function (status) {
                if ((status.north.isSet && !status.west.isSet) ||
                    (!status.north.isSet && status.west.isSet)) {
                    return true
                } else if ((status.south.isSet && !status.east.isSet) ||
                    (!status.south.isSet && status.east.isSet)) {
                    return true;
                }

                return false;

            },

            /**
             * Checks that there are either two or four coordinate values. If there aren't,
             * it means that the user still needs to enter coordinates.
             * 
             * @function checkForPairs
             * @param status The current state of the coordinates
             * @return {bool} True if there are pairs, false otherwise
             */
            checkForPairs: function (status) {
                var isSet = _.filter(status, function (coord) { return coord.isSet == true; });

                if (isSet.length == 0) {
                    return false;
                }
                return true;
            },

            /**
             * Validate a coordinate String by making sure it can be coerced into a number and
             * is within the given bounds.
             * Note: Min and max are inclusive 
             *
             * @function validateCoordinate
             * @param value {string} The value of the edit area that will be validated
             * @param min The minimum value that 'value' can be
             * @param max The maximum value that 'value' can be
             * @return {bool} True if the validation passed, otherwise false
             */
            validateCoordinate: function (value, min, max) {

                if (typeof value === "undefined" || value === null || value === "" && isNaN(value)) {
                    return false;
                }

                var parsed = Number(value);

                if (isNaN(parsed)) {
                    return false;
                }

                if (parsed < min || parsed > max) {
                    return false;
                }

                return true;
            },

            trickleUpChange: function () {
                this.get("parentModel").trigger("change");
            },

            formatXML: function (xmlString) {
                return DataONEObject.prototype.formatXML.call(this, xmlString);
            }
        });

        return EMLGeoCoverage;
    });
