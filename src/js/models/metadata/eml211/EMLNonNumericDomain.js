define(["jquery", "underscore", "backbone", "models/DataONEObject"], function (
  $,
  _,
  Backbone,
  DataONEObject,
) {
  /**
   * @class EMLNonNumericDomain
   * @classdesc EMLNonNumericDomain represents the measurement scale of a nominal
   * or ordinal measurement scale attribute, and is an extension of
   * EMLMeasurementScale.
   * @classcategory Models/Metadata/EML211
   * @see https://eml.ecoinformatics.org/schema/eml-attribute_xsd.html#AttributeType_AttributeType_measurementScale_AttributeType_AttributeType_measurementScale_nominal_nonNumericDomain
   * @extends Backbone.Model
   * @constructor
   */
  var EMLNonNumericDomain = Backbone.Model.extend(
    /** @lends EMLNonNumericDomain.prototype */ {
      type: "EMLNonNumericDomain",

      /* Attributes of an EMLNonNumericDomain object */
      defaults: function () {
        return {
          /* Attributes from EML, extends attributes from EMLMeasurementScale */
          measurementScale: null, // the name of this measurement scale
          nonNumericDomain: [], // One or more of enumeratedDomain, textDomain, references
        };
      },

      /**
       * The map of lower case to camel case node names
       * needed to deal with parsing issues with $.parseHTML().
       * Use this until we can figure out issues with $.parseXML().
       * @type {object}
       */
      nodeNameMap: {
        nonnumericdomain: "nonNumericDomain",
        enumerateddomain: "enumeratedDomain",
        textdomain: "textDomain",
        externalcodeset: "externalCodeSet",
        codesetname: "codesetName",
        codeseturl: "codesetURL",
        entityCodeList: "entityCodeList",
        entityreference: "entityReference",
        valueattributereference: "valueAttributeReference",
        definitionattributereference: "definitionAttributeReference",
        orderattributereference: "orderAttributeReference",
        sourced: "source",
      },

      /* Initialize an EMLNonNumericDomain object */
      initialize: function (attributes, options) {
        this.on("change:nonNumericDomain", this.trickleUpChange);
      },

      /**
       * Parse the incoming measurementScale's XML elements
       */
      parse: function (attributes, options) {
        var $objectDOM;
        var nonNumericDomainNodeList;
        var domainNodeList; // the list of domain elements
        var domain; // the text or enumerated domain to parse
        var domainObject; // The parsed domain object to be added to attributes.nonNumericDomain
        var rootNodeName; // Name of the fragment root elements

        if (attributes.objectDOM) {
          rootNodeName = $(attributes.objectDOM)[0].localName;
          $objectDOM = $(attributes.objectDOM);
        } else if (attributes.objectXML) {
          rootNodeName = $(attributes.objectXML)[0].localName;
          $objectDOM = $($(attributes.objectXML)[0]);
        } else {
          return {};
        }

        // do we have an appropriate measurementScale tree?
        var index = _.indexOf(
          ["measurementscale", "nominal", "ordinal"],
          rootNodeName,
        );
        if (index == -1) {
          throw new Error(
            "The measurement scale XML does not have a root " +
              "node of 'measurementScale', 'nominal', or 'ordinal'.",
          );
        }

        // If measurementScale is present, add it
        if (rootNodeName == "measurementscale") {
          attributes.measurementScale = $objectDOM
            .children()
            .first()[0].localName;
          $objectDOM = $objectDOM.children().first();
        } else {
          attributes.measurementScale = $objectDOM.localName;
        }

        nonNumericDomainNodeList = $objectDOM.find("nonnumericdomain");

        if (nonNumericDomainNodeList && nonNumericDomainNodeList.length > 0) {
          domainNodeList = nonNumericDomainNodeList[0].children;
        } else {
          // No content is available, return
          return attributes;
        }

        // Initialize an array of nonNumericDomain objects
        attributes.nonNumericDomain = [];

        // Set each domain if we have it
        if (domainNodeList && domainNodeList.length > 0) {
          _.each(
            domainNodeList,
            function (domain) {
              if (domain) {
                // match the camelCase name since DOMParser() is XML-aware
                switch (domain.localName) {
                  case "textdomain":
                    domainObject = this.parseTextDomain(domain);
                    break;
                  case "enumerateddomain":
                    domainObject = this.parseEnumeratedDomain(domain);
                    break;
                  case "references":
                    // TODO: Support references
                    console.log(
                      "In EMLNonNumericDomain.parse()" +
                        "We don't support references yet ",
                    );
                  default:
                    console.log(
                      "Unrecognized nonNumericDomain: " + domain.nodeName,
                    );
                }
              }
              attributes.nonNumericDomain.push(domainObject);
            },
            this,
          );
        }

        // Add in the textDomain content if present
        // TODO

        attributes.objectDOM = $objectDOM[0];

        return attributes;
      },

      /* Parse the nonNumericDomain/textDomain fragment
       * returning an object with a textDomain attribute, like:
       * {
       *     textDomain: {
       *         definition: "Some definition",
       *         pattern: ["*", "\w", "[0-9]"],
       *         source: "Some source reference"
       *     }
       * }
       */
      parseTextDomain: function (domain) {
        var domainObject = {};
        domainObject.textDomain = {};
        var xmlID;
        var definition;
        let patterns = [];
        var source;

        // Add the XML id attribute
        if ($(domain).attr("id")) {
          xmlID = $(domain).attr("id");
        } else {
          // Generate an id if it's not found
          xmlID = DataONEObject.generateId();
        }
        domainObject.textDomain.xmlID = xmlID;

        // Add the definition
        definition = $(domain).children("definition").text();
        domainObject.textDomain.definition = definition;

        // Add the pattern
        _.each($(domain).children("pattern"), function (pattern) {
          patterns.push(pattern.textContent);
        });
        domainObject.textDomain.pattern = patterns;

        // Add the source
        source = $(domain).children("sourced").text();
        domainObject.textDomain.source = source;

        return domainObject;
      },

      /* Parse the nonNumericDomain/enumeratedDomain fragment
       * returning an object with an enumeratedDomain attribute, like:
       * var emlCitation = {};
       * var nonNumericDomain = [
       *     {
       *         enumeratedDomain: {
       *             codeDefinition: [
       *                 {
       *                     code: "Some code", // required
       *                     definition: "Some definition", // required
       *                     source: "Some source"
       *                 } // repeatable
       *             ]
       *         }
       *     }, // or
       *     {
       *         enumeratedDomain: {
       *             externalCodeSet: [
       *                 {
       *                     codesetName: "Some code", // required
       *                     citation: [emlCitation], // one of citation or codesetURL
       *                     codesetURL: ["Some URL"] // is required, both repeatable
       *                 } // repeatable
       *             ]
       *         }
       *     }, // or
       *     {
       *         enumeratedDomain: {
       *             entityCodeList: {
       *                 entityReference: "Some reference", // required
       *                 valueAttributeReference: "Some attr reference", // required
       *                 definitionAttributeReference: "Some definition attr reference", // required
       *                 orderAttributeReference: "Some order attr reference"
       *             }
       *         }
       *     }
       * ]
       */
      parseEnumeratedDomain: function (domain) {
        var domainObject = {};
        domainObject.enumeratedDomain = {};
        var codeDefinition = {};
        var externalCodeSet = {};
        var entityCodeList = {};
        var xmlID;

        // Add the XML id attribute
        if ($(domain).attr("id")) {
          xmlID = $(domain).attr("id");
        } else {
          // Generate an id if it's not found
          xmlID = DataONEObject.generateId();
        }
        domainObject.enumeratedDomain.xmlID = xmlID;

        // Add the codeDefinitions if present
        var codeDefinitions = $(domain).children("codedefinition");

        if (codeDefinitions.length) {
          domainObject.enumeratedDomain.codeDefinition = [];
          _.each(codeDefinitions, function (codeDef) {
            var code = $(codeDef).children("code").text();
            var definition = $(codeDef).children("definition").text();
            var source = $(codeDef).children("sourced").text() || undefined;
            domainObject.enumeratedDomain.codeDefinition.push({
              code: code,
              definition: definition,
              source: source,
            });
          });
        }
        return domainObject;
      },

      /* Serialize the model to XML */
      serialize: function () {
        var objectDOM = this.updateDOM();
        var xmlString = objectDOM.outerHTML;

        // Camel-case the XML
        xmlString = this.formatXML(xmlString);

        return xmlString;
      },

      /* Copy the original XML DOM and update it with new values from the model */
      updateDOM: function (objectDOM) {
        var objectDOM;
        var xmlID; // The id of the textDomain or enumeratedDomain fragment
        var nonNumericDomainNode;
        var domainType; // Either textDomain or enumeratedDomain
        var $domainInDOM; // The jQuery object of the text or enumerated domain from the DOM
        var nodeToInsertAfter;
        var domainNode; // Either a textDomain or enumeratedDomain node
        var definitionNode;
        var patternNode;
        var sourceNode;
        var enumeratedDomainNode;
        var codeDefinitions;
        var codeDefinitionNode;
        var codeNode;

        var type = this.get("measurementScale");
        if (typeof type === "undefined") {
          console.warn("Defaulting to an nominal measurementScale.");
          type = "nominal";
        }
        if (!objectDOM) {
          objectDOM = this.get("objectDOM");
        }
        var objectXML = this.get("objectXML");

        // If present, use the cached DOM
        if (objectDOM) {
          objectDOM = objectDOM.cloneNode(true);

          // otherwise, use the cached XML
        } else if (objectXML) {
          objectDOM = $(objectXML)[0].cloneNode(true);

          // This is new, create it
        } else {
          objectDOM = document.createElement(type);
        }

        if (this.get("nonNumericDomain").length) {
          // Update each nonNumericDomain in the DOM
          _.each(
            this.get("nonNumericDomain"),
            function (domain, i) {
              // Is this a textDomain or enumeratedDomain?
              if (typeof domain.textDomain === "object") {
                domainType = "textDomain";
                xmlID = domain.textDomain.xmlID;
              } else if (typeof domain.enumeratedDomain === "object") {
                domainType = "enumeratedDomain";
                xmlID = domain.enumeratedDomain.xmlID;
              } else {
                console.log("Unrecognized NonNumericDomain type. Skipping.");
                // TODO: Handle references here
              }

              // Update the existing DOM node by id
              if (xmlID && $(objectDOM).find("#" + xmlID).length) {
                if (domainType === "textDomain") {
                  let originalTextDomain = $(objectDOM)
                    .find("#" + xmlID)
                    .find("textdomain");

                  //If there are existing textDomain nodes in the DOM, update them
                  if (originalTextDomain.length) {
                    let updatedTextDomain = this.updateTextDomain(
                      domain.textDomain,
                      originalTextDomain,
                    );
                    originalTextDomain.replaceWith(updatedTextDomain);
                  }
                  //If there are no textDomain nodes in the DOM, create new ones
                  else {
                    //Create new textDomain nodes
                    let newTextDomain = this.createTextDomain(
                      domain.textDomain,
                    );

                    //Insert the new textDomain nodes into the nonNumericDomain node
                    $($(objectDOM).children("nonnumericdomain")[i]).html(
                      newTextDomain,
                    );
                  }
                } else if (domainType === "enumeratedDomain") {
                  this.updateEnumeratedDomainDOM(
                    domain.enumeratedDomain,
                    $domainInDOM,
                  );
                }

                //If there is no XML ID but there are the same number of nonNumericDomains in the model and DOM
              } else if (
                this.get("nonNumericDomain").length ==
                  $(objectDOM).children("nonnumericdomain").length &&
                $(objectDOM).children("nonnumericdomain").length >= i
              ) {
                //If this is a text domain,
                if (typeof domain.textDomain === "object") {
                  let originalTextDomain = $(
                    $(objectDOM).children("nonnumericdomain")[i],
                  ).find("textdomain");

                  //If there are existing textDomain nodes in the DOM, update them
                  if (originalTextDomain.length) {
                    let updatedTextDomain = this.updateTextDomain(
                      domain.textDomain,
                      originalTextDomain,
                    );
                    originalTextDomain.replaceWith(updatedTextDomain);
                  }
                  //If there are no textDomain nodes in the DOM, create new ones
                  else {
                    //Create new textDomain nodes
                    var newTextDomain = this.createTextDomain(
                      domain.textDomain,
                    );

                    //Insert the new textDomain nodes into the nonNumericDomain node
                    $($(objectDOM).children("nonnumericdomain")[i]).html(
                      newTextDomain,
                    );
                  }
                } else if (typeof domain.enumeratedDomain === "object") {
                  //Get the nonNumericDomain node from the DOM
                  var nonNumericDomainNode =
                      $(objectDOM).children("nonnumericdomain")[i],
                    enumeratedDomain =
                      $(nonNumericDomainNode).children("enumerateddomain");

                  if (enumeratedDomain.length) {
                    this.updateEnumeratedDomainDOM(
                      domain.enumeratedDomain,
                      enumeratedDomain,
                    );
                  } else {
                    //Remove the textDomain node and replace it with an enumeratedDomain node
                    var textDomainToReplace = $(objectDOM).find("textdomain");

                    if (textDomainToReplace.length > 0) {
                      $(textDomainToReplace[i]).replaceWith(
                        this.createEnumeratedDomainDOM(domain.enumeratedDomain),
                      );
                    } else {
                      nonNumericDomainNode.html(
                        this.createEnumeratedDomainDOM(
                          domain.enumeratedDomain,
                          document.createElement("enumerateddomain"),
                        ),
                      );
                    }
                  }
                }

                // Otherwise append to the DOM
              } else {
                // Add the nonNumericDomain element
                nonNumericDomainNode =
                  document.createElement("nonnumericdomain");

                if (domainType === "textDomain") {
                  // Add the definiton element
                  domainNode = document.createElement("textdomain");
                  if (domain.textDomain.definition) {
                    definitionNode = document.createElement("definition");
                    $(definitionNode).text(domain.textDomain.definition);
                    $(domainNode).append(definitionNode);
                  }

                  // Add the pattern element(s)
                  if (domain.textDomain.pattern.length) {
                    _.each(
                      domain.textDomain.pattern,
                      function (pattern) {
                        patternNode = document.createElement("pattern");
                        $(patternNode).text(pattern);
                        $(domainNode).append(patternNode);
                      },
                      this,
                    );
                  }

                  // Add the source element
                  if (domain.textDomain.source) {
                    sourceNode = document.createElement("sourced"); // Accommodate parseHTML() with "d"
                    $(sourceNode).text(domain.textDomain.source);
                    $(domainNode).append(sourceNode);
                  }
                } else if (domainType === "enumeratedDomain") {
                  nonNumericDomainNode.append(
                    this.createEnumeratedDomainDOM(domain.enumeratedDomain),
                  );
                } else {
                  console.log(
                    "The domainType: " + domainType + " is not recognized.",
                  );
                }
                $(nonNumericDomainNode).append(domainNode);
                $(objectDOM).append(nonNumericDomainNode);
              }
            },
            this,
          );
        } else {
          // We have no content, so can't create a valid domain
          console.log(
            "In EMLNonNumericDomain.updateDOM(),\n" +
              "references are not handled yet. Returning undefined.",
          );
          // TODO: handle references here
          return undefined;
        }
        return objectDOM;
      },

      /*
       * Update the codeDefinitionList in the  first enumeratedDomain
       * found in the nonNumericDomain array.
       * TODO: Refactor this to support externalCodeSet and entityCodeList
       * TODO: Support the source field
       * TODO: Support repeatable enumeratedDomains
       * var nonNumericDomain = [
       *     {
       *         enumeratedDomain: {
       *             codeDefinition: [
       *                 {
       *                     code: "Some code", // required
       *                     definition: "Some definition", // required
       *                     source: "Some source"
       *                 } // repeatable
       *             ]
       *         }
       *     }
       * ]
       */
      updateEnumeratedDomain: function (code, definition, index) {
        var nonNumericDomain = this.get("nonNumericDomain");
        var enumeratedDomain = {};
        var codeDefinitions;

        if (typeof code == "string" && !code.trim().length) {
          code = "";
        }

        if (typeof definition == "string" && !definition.trim().length) {
          definition = "";
        }

        // Create from scratch
        if (
          !nonNumericDomain.length ||
          !nonNumericDomain[0] ||
          !nonNumericDomain[0].enumeratedDomain
        ) {
          nonNumericDomain[0] = {
            enumeratedDomain: {
              codeDefinition: [
                {
                  code: code,
                  definition: definition,
                },
              ],
            },
          };
        }
        // Update existing
        else {
          enumeratedDomain = this.get("nonNumericDomain")[0].enumeratedDomain;

          if (typeof enumeratedDomain !== "undefined") {
            //If there is no code or definition, then remove it from the code list
            if (!code && code !== 0 && !definition && definition !== 0) {
              this.removeCode(index);
            } else if (enumeratedDomain.codeDefinition.length >= index) {
              //Create a new code object and insert it into the array
              enumeratedDomain.codeDefinition[index] = {
                code: code,
                definition: definition,
              };
            } else {
              //Create a new code object and append it to the end of the array
              enumeratedDomain.codeDefinition.push({
                code: code,
                definition: definition,
              });
            }
          }
        }

        //Manually trigger the change event since we're updating an array on the model
        this.trigger("change:nonNumericDomain");
      },

      /*
       * Given a `codeDefinition` HTML node and an enumeratedDomain list,
       *   this function will update the HTML node code definitions with
       *   all the code definitions listed in the enumeratedDomain
       *
       * @param {object} enumeratedDomain - A literal object with an array of codeDefinitions
       * @param {DOM Element or jQuery Object} - A DOM Element or jQuery selection that represents the <enumeratedDomain> node
       */
      updateEnumeratedDomainDOM: function (
        enumeratedDomain,
        enumeratedDomainNode,
      ) {
        if (enumeratedDomain.codeDefinition.length) {
          // Update each codeDefinition
          _.each(
            enumeratedDomain.codeDefinition,
            function (codeDef, i) {
              var codeDefNode = $(
                $(enumeratedDomainNode).children("codedefinition")[i],
              );

              if (!codeDefNode.length) {
                codeDefNode = $(document.createElement("codedefinition"));
                $(enumeratedDomainNode).append(codeDefNode);
              }

              // Update the required code element
              if (codeDef.code) {
                var codeNode = codeDefNode.children("code");

                //If there is no <code> XML node, make one
                if (!codeNode.length) {
                  codeNode = $(document.createElement("code"));
                  codeDefNode.append(codeNode);
                }

                //Add the code text to the <code> node
                codeNode.text(codeDef.code);
              } else {
                codeDefNode.children("code").remove();
              }

              // Update the required definition element
              if (codeDef.definition) {
                var defNode = codeDefNode.children("definition");

                //If there is no <definition> XML node, make one
                if (!defNode.length) {
                  defNode = $(document.createElement("definition"));
                  codeDefNode.append(defNode);
                }

                //Add the definition text to the <definition> node
                defNode.text(codeDef.definition);
              } else {
                codeDefNode.children("definition").remove();
              }

              // Update the optional source element
              if (codeDef.source) {
                // Accommodate parseHTML() with source"d"
                var sourceNode = codeDefNode.children("sourced");

                //If there is no <source> XML node, make one
                if (!sourceNode.length) {
                  sourceNode = $(document.createElement("sourced"));
                  codeDefNode.append(sourceNode);
                }

                sourceNode.text(codeDef.source);
              } else {
                codeDefNode.children("sourced").remove();
              }
            },
            this,
          );

          // If there are more codeDefinition nodes than there are codeDefinitions
          // in the model, then we need to remove the extraneous nodes
          var numNodes =
              $(enumeratedDomainNode).children("codedefinition").length,
            numCodes = enumeratedDomain.codeDefinition.length;

          if (numNodes > numCodes) {
            //Get the extraneous nodes by selecting the last X child elements
            var nodesToRemove = $(enumeratedDomainNode)
              .children("codedefinition")
              .slice((numNodes - numCodes) * -1);
            //Remove them from the DOM
            nodesToRemove.remove();
          }
        } else if (domain.enumeratedDomain.externalCodeSet) {
          // TODO Handle externalCodeSet
        } else if (domain.enumeratedDomain.entityCodeList) {
          // TODO Handle entityCodeList
        }

        return enumeratedDomainNode;
      },

      /*
       * Given an enumeratedDomain list, this function will create an
       *   <enumeratedDomain> HTML element with all the code definitions
       *   listed in the enumeratedDomain object
       *
       * @param {object} enumeratedDomain - A literal object with an array of codeDefinitions
       * @return {DOM Element} - An <enumerateddomain> DOM element tree with code definitions
       */
      createEnumeratedDomainDOM: function (enumeratedDomain) {
        var enumeratedDomainNode = document.createElement("enumerateddomain");

        if (enumeratedDomain.codeDefinition.length) {
          // Add each codeDefinition
          _.each(
            enumeratedDomain.codeDefinition,
            function (codeDef) {
              var codeDefinitionNode = document.createElement("codedefinition");

              // Add the required code element
              if (codeDef.code) {
                var codeNode = document.createElement("code");
                $(codeNode).text(codeDef.code);
                $(codeDefinitionNode).append(codeNode);
              }

              // Add the required definition element
              if (codeDef.definition) {
                var definitionNode = document.createElement("definition");
                $(definitionNode).text(codeDef.definition);
                $(codeDefinitionNode).append(definitionNode);
              }

              // Add the optional source element
              if (codeDef.source) {
                var sourceNode = document.createElement("sourced"); // Accommodate parseHTML() with "d"
                $(sourceNode).text(codeDef.source);
                $(codeDefinitionNode).append(sourceNode);
              }
              $(enumeratedDomainNode).append(codeDefinitionNode);
            },
            this,
          );
        } else if (domain.enumeratedDomain.externalCodeSet) {
          // TODO Handle externalCodeSet
        } else if (domain.enumeratedDomain.entityCodeList) {
          // TODO Handle entityCodeList
        }

        return enumeratedDomainNode;
      },

      /*
       * Given a textDomain object, and textDomain DOM object, this function
       *  will update all the DOM elements with the textDomain object values
       *
       * @param {object} textDomain - A literal object representing an EML text domain
       * @param {DOM Element} textDomainEl - The <textDomain> DOM Element to update
       * @return {DOM Element} - An <textdomain> DOM element tree to update
       */
      updateTextDomain: function (textDomain, textDomainEl) {
        if (
          typeof textDomainEl === "undefined" ||
          (typeof textDomainEl == "object" && textDomainEl.length == 0)
        )
          var textDomainEl = document.createElement("textdomain");

        //Create a shortcut to the jQuery object of the text domain element
        var $textDomainEl = $(textDomainEl);

        var definitionEl = $textDomainEl.find("definition");

        //Update the definition element text
        if (definitionEl.length > 0) definitionEl.text(textDomain.definition);
        else {
          $textDomainEl.prepend(
            $(document.createElement("definition")).text(textDomain.definition),
          );
        }

        // Remove existing patterns
        $textDomainEl.find("pattern").remove();

        // Add any new patterns
        if (textDomain.pattern && textDomain.pattern.length) {
          let patterns = Array.from(textDomain.pattern).reverse();

          _.each(patterns, function (pattern) {
            //Don't serialize strings with only empty characters
            if (typeof pattern == "string" && !pattern.trim().length) return;

            var patternNode = document.createElement("pattern");

            $(patternNode).text(pattern);

            // Prepend before the sourced element if present
            if ($textDomainEl.find("sourced").length) {
              $textDomainEl.find("sourced").before(patternNode);
            } else {
              $textDomainEl.append(patternNode);
            }
          });
        }

        // Update any new source
        if (textDomain.source) {
          if ($textDomainEl.find("sourced").length) {
            $textDomainEl.find("sourced").text(textDomain.source);
          } else {
            //
            var src = document.createElement("sourced");
            src.textContent = textDomain.source;
            $textDomainEl.find("textDomain").append(src);
          }
        } else {
          // Remove the source in the DOM not present in the textDomain
          // TODO: Uncomment this when we support "source" in the UI
          // $domainInDOM.children("source").remove();
        }

        return textDomainEl;
      },

      /*
       * Creates a textDomain DOM object with the textDomain object values
       *
       * @param {object} textDomain - A literal object representing an EML text domain
       * @return {DOM Element} - An <textdomain> DOM element tree to update
       */
      createTextDomain: function (textDomain) {
        var textDomainEl = document.createElement("textdomain");

        this.updateTextDomain(textDomain, textDomainEl);

        return textDomainEl;
      },

      /*
       * Get the DOM node preceding the given nodeName
       * to find what position in the EML document
       * the named node should be appended
       */
      getEMLPosition: function (objectDOM, nodeName) {
        // TODO: set the node order
        var nodeOrder = ["enumerateddomain", "textdomain"];

        var position = _.indexOf(nodeOrder, nodeName);

        // Append to the bottom if not found
        if (position == -1) {
          return $(objectDOM).children().last()[0];
        }

        // Otherwise, go through each node in the node list and find the
        // position where this node will be inserted after
        for (var i = position - 1; i >= 0; i--) {
          if ($(objectDOM).find(nodeOrder[i]).length) {
            return $(objectDOM).find(nodeOrder[i]).last()[0];
          }
        }
      },

      /* Let the top level package know of attribute changes from this object */
      trickleUpChange: function () {
        MetacatUI.rootDataPackage.packageModel.set("changed", true);
      },

      validate: function () {
        var errors = {};

        if (!this.get("nonNumericDomain").length)
          errors.nonNumericDomain = "Choose a possible value type.";
        else {
          var domain = this.get("nonNumericDomain")[0];

          _.each(
            Object.keys(domain),
            function (key) {
              //For enumerated domain types
              if (key == "enumeratedDomain" && domain[key].codeDefinition) {
                var isEmpty =
                  domain[key].codeDefinition.length == 0 ? true : false;

                //Validate the list of codes
                for (var i = 0; i < domain[key].codeDefinition.length; i++) {
                  var codeDef = domain[key].codeDefinition[i];

                  //If either the code or definition is missing in at least one codeDefinition set,
                  //then this model is invalid
                  if (
                    (codeDef.code && !codeDef.definition) ||
                    (!codeDef.code && codeDef.definition)
                  ) {
                    errors.enumeratedDomain =
                      "Provide both a code and definition in each row.";
                    i = domain[key].codeDefinition.length;
                  } else if (
                    domain[key].codeDefinition.length == 1 &&
                    !codeDef.code &&
                    !codeDef.definition
                  )
                    isEmpty = true;
                }

                if (isEmpty)
                  errors.enumeratedDomain =
                    "Define at least one code and definition.";
              } else if (
                key == "textDomain" &&
                (typeof domain[key] != "object" || !domain[key].definition)
              ) {
                errors.definition =
                  "Provide a description of the kind of text allowed.";
              }
            },
            this,
          );
        }

        if (Object.keys(errors).length) return errors;
        else {
          this.trigger("valid");

          return;
        }
      },

      /*
       * Climbs up the model heirarchy until it finds the EML model
       *
       * @return {EML211 or false} - Returns the EML 211 Model or false if not found
       */
      getParentEML: function () {
        var emlModel = this.get("parentModel"),
          tries = 0;

        while (emlModel.type !== "EML" && tries < 6) {
          emlModel = emlModel.get("parentModel");
          tries++;
        }

        if (emlModel && emlModel.type == "EML") return emlModel;
        else return false;
      },

      removeCode: function (index) {
        var codeToRemove =
          this.get("nonNumericDomain")[0].enumeratedDomain.codeDefinition[
            index
          ];

        var newCodeList = _.without(
          this.get("nonNumericDomain")[0].enumeratedDomain.codeDefinition,
          codeToRemove,
        );

        this.get("nonNumericDomain")[0].enumeratedDomain.codeDefinition =
          newCodeList;

        this.trigger("change:nonNumericDomain");
      },
    },
  );

  return EMLNonNumericDomain;
});
