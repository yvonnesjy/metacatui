define([
  "../../../../../../../../src/js/models/metadata/eml211/EMLParty",
], function (EMLParty) {
  // Configure the Chai assertion library
  var should = chai.should();
  var expect = chai.expect;

  describe("EMLParty Test Suite", function () {
    describe("Creating", function () {
      it("should be created from the logged in user");
    });

    describe("Parsing", function () {
      it("should parse complex EML Party XML", function () {
        const xmlString = `<responsibleParty>
            <individualName>
                <salutation>Dr.</salutation>
                <givenName>John</givenName>
                <surName>Doe</surName>
            </individualName>
            <organizationName>Environmental Research Institute</organizationName>
            <positionName>Lead Research Scientist</positionName>
            <electronicMailAddress>john.doe@eri.org</electronicMailAddress>
            <phone phonetype="voice">123-456-7890</phone>
            <address>
                <deliveryPoint>123 Green Street</deliveryPoint>
                <city>Ecotown</city>
                <administrativeArea>Greenland</administrativeArea>
                <postalCode>12345</postalCode>
                <country>USA</country>
            </address>
            <role>originator</role>
        </responsibleParty>`;
        const party = new EMLParty({
          objectDOM: $(xmlString),
          parse: true,
          type: "responsibleParty",
        });

        const salutation = party.get("individualName").salutation[0];
        const givenName = party.get("individualName").givenName[0];
        const surName = party.get("individualName").surName;
        const organizationName = party.get("organizationName");
        const positionName = party.get("positionName");
        const electronicMailAddress = party.get("email")[0];
        const phone = party.get("phone")[0];
        const address = party.get("address")[0];
        const deliveryPoint = address.deliveryPoint[0];
        const city = address.city;
        const administrativeArea = address.administrativeArea;
        const postalCode = address.postalCode;
        const country = address.country;
        const role = party.get("roles")[0];

        salutation.should.equal("Dr.");
        givenName.should.equal("John");
        surName.should.equal("Doe");
        organizationName.should.equal("Environmental Research Institute");
        positionName.should.equal("Lead Research Scientist");
        electronicMailAddress.should.equal("john.doe@eri.org");
        phone.should.equal("123-456-7890");
        deliveryPoint.should.equal("123 Green Street");
        city.should.equal("Ecotown");
        administrativeArea.should.equal("Greenland");
        postalCode.should.equal("12345");
        country.should.equal("USA");
        role.should.equal("originator");
      });

      it("should parse the individual name");
      it("should parse the organization name");
      it("should parse the position name");
      it("should parse the address");
      it("should parse the individual name");
      it("should parse the phone, fax, email, and online URL");
      it("should parse the associated party role");
      it("should parse the XML ID");
    });

    describe("Serializing", function () {
      it("should update the individual name");
      it("should update the organization name");
      it("should update the position name");
      it("should update the address");
      it("should update the individual name");
      it("should update the phone, fax, email, and online URL");
      it("should update the associated party role");
      it("should update the XML ID");
    });

    describe("Validation", function () {
      it("requires a name");
      it("can require an email");
      it("can require a country");
      it("can require a user id (ORCID)");
    });
  });
});
