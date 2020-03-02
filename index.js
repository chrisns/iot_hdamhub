'use strict'
const hda = require("hdamhub")
const _ = { isEqual: require("lodash.isequal") }
const Iot = require("@chrisns/iot-shorthand")
const iot = new Iot()

const { HDA_ADDRESS } = process.env

const api = new hda.api(HDA_ADDRESS)
var device = ""

const maintain_status = () =>
  setInterval(async () => {
    try {
      var status = await api.getStatus()
      var power_state = await api.getPowerState()
      status.zones = status.zones.map(zone => { return { id: zone.zone_id, input: zone.state[0].input_id } })
      update_if_different({ ...status, ...power_state })
    }
    catch (e) {
      console.error(e); process.exit(1)
    }
  }, 5000)


var last_payload = {}
const update_if_different = (payload) => {
  if (_.isEqual(last_payload, payload))
    return
  iot.report(device, payload)
  last_payload = payload
}

const event_handler = (payload) => {
  if (payload.power === true)
    api.powerOn()
  if (payload.power === false)
    api.powerOff()
  if (payload.zones)
    payload.zones.map(zone => switchZoneInput(zone.id, zone.input))
}

api.getSystemInfo()
  .then(data => {
    device = `mhub_${data.mhub.serial_number}`
    iot.discovered({
      name: device,
      type: "mhub",
      attributes: {
        serial: data.mhub.serial_number,
        mhubname: data.mhub.mhub_name.replace(" ", "_"),
        ip: data.mhub.ip_address,
      }
    }, event_handler)
  })
  .catch(e => { console.error(e); process.exit(1) })
  .then(maintain_status)