const encoder = new TextEncoder();
const decoder = new TextDecoder();

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function utf8(text: string) {
  const bytes = encoder.encode(text);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = bytes.length >> 8;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  return out;
}

function remaining(length: number) {
  const bytes: number[] = [];
  do {
    let digit = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) digit |= 0x80;
    bytes.push(digit);
  } while (length > 0 && bytes.length < 4);
  return Uint8Array.from(bytes);
}

function packet(type: number, body: Uint8Array) {
  return concat([Uint8Array.of(type), remaining(body.length), body]);
}

export function connectPacket(clientId: string) {
  return packet(
    0x10,
    concat([utf8("MQTT"), Uint8Array.of(0x04, 0x02, 0x00, 0x3c), utf8(clientId)]),
  );
}

export function publishPacket(topic: string, payload: string) {
  return packet(0x30, concat([utf8(topic), encoder.encode(payload)]));
}

export function subscribePacket(topic: string, packetId = 1) {
  return packet(
    0x82,
    concat([Uint8Array.of(packetId >> 8, packetId & 0xff), utf8(topic), Uint8Array.of(0)]),
  );
}

export function pingPacket() {
  return Uint8Array.of(0xc0, 0x00);
}

export type MqttPacket = { type: number; body: Uint8Array };

export function parsePackets(input: Uint8Array) {
  const packets: MqttPacket[] = [];
  let offset = 0;
  while (offset < input.length) {
    let multiplier = 1;
    let length = 0;
    let pos = offset + 1;
    let digit = 0;
    let count = 0;
    do {
      if (pos >= input.length || count > 3) {
        return { packets, rest: input.slice(offset) };
      }
      digit = input[pos];
      pos += 1;
      count += 1;
      length += (digit & 127) * multiplier;
      multiplier *= 128;
    } while (digit & 128);
    if (pos + length > input.length) return { packets, rest: input.slice(offset) };
    packets.push({ type: input[offset] >> 4, body: input.slice(pos, pos + length) });
    offset = pos + length;
  }
  return { packets, rest: new Uint8Array() };
}

export function parsePublish(body: Uint8Array) {
  const topicLength = (body[0] << 8) | body[1];
  const topic = decoder.decode(body.slice(2, 2 + topicLength));
  const payload = decoder.decode(body.slice(2 + topicLength));
  return { topic, payload };
}
