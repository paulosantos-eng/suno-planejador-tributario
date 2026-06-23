"use client";

import { CLIENTS, getClient as getMockClient, getOperationsForClient } from "@/lib/data/mock-clients";
import {
  getCustomClients,
  getCustomOperations,
  getCustomVehicles,
  getMonthlyInputs,
  getMonthlyInputSettings,
  inputsToOperations,
} from "@/lib/storage/local-storage";
import { getDetailedPositions, listFiscalEvents, runEngine } from "@/lib/tax-engine/engine";
import type { Client, FiscalEvent, Operation, Vehicle } from "@/lib/tax-engine/types";

export interface ClientSummary {
  id: string;
  aum: number;
  costAum: number;
  unrealizedGain: number;
  irProjected: number;
  status: "ok" | "warn" | "alert";
  statusText: string;
}

export interface RuntimeClientSummary {
  client: Client;
  summary: ClientSummary;
}

export interface RuntimeFiscalEvent extends FiscalEvent {
  clientId: string;
  clientName: string;
  vehicleId: string;
  status: ClientSummary["status"];
  statusText: string;
}

function mergeVehicles(client: Client): Client {
  const extraVehicles = getCustomVehicles(client.id);
  const byId = new Map<string, Vehicle>();

  for (const vehicle of client.vehicles) byId.set(vehicle.id, vehicle);
  for (const vehicle of extraVehicles) byId.set(vehicle.id, vehicle);

  return { ...client, vehicles: [...byId.values()] };
}

export function isMockClient(clientId: string): boolean {
  return Boolean(getMockClient(clientId));
}

export function getRuntimeClients(): Client[] {
  const customById = new Map(getCustomClients().map((client) => [client.id, mergeVehicles(client)]));
  const clients = CLIENTS.map((client) => customById.get(client.id) ?? mergeVehicles(client));

  for (const client of customById.values()) {
    if (!CLIENTS.some((mock) => mock.id === client.id)) clients.push(client);
  }

  return clients;
}

export function getRuntimeClient(clientId: string): Client | undefined {
  const mock = getMockClient(clientId);
  if (mock) return mergeVehicles(mock);
  return getCustomClients()
    .map(mergeVehicles)
    .find((client) => client.id === clientId);
}

export function getPrimaryVehicle(client: Client): Vehicle | undefined {
  return client.vehicles.find((vehicle) => vehicle.type === "PF") ?? client.vehicles[0];
}

export function getRuntimeOperations(client: Client, year = 2026): Operation[] {
  const vehicle = getPrimaryVehicle(client);
  const baseOps = isMockClient(client.id) ? getOperationsForClient(client.id) : [];
  const storedOps = getCustomOperations(client.id);
  if (!vehicle) return [...baseOps, ...storedOps];

  const inputOps = inputsToOperations(
    client.id,
    vehicle.id,
    getMonthlyInputs(client.id),
    year,
    `CUSTOM-PJ-${client.id}`,
    getMonthlyInputSettings(client.id),
  );

  return [...baseOps, ...storedOps, ...inputOps];
}

export function summarizeRuntimeClient(client: Client): ClientSummary {
  const ops = getRuntimeOperations(client);
  const result = runEngine(ops);
  const vehicle = getPrimaryVehicle(client);

  if (!vehicle) {
    return {
      id: client.id,
      aum: 0,
      costAum: 0,
      unrealizedGain: 0,
      irProjected: 0,
      status: "ok",
      statusText: "Sem veículo",
    };
  }

  let aum = 0;
  let costAum = 0;
  let irYear = 0;
  let irrf15270 = 0;
  let irpfmDue = 0;

  const detailedPositions = getDetailedPositions(result, vehicle.id);
  for (const pos of detailedPositions) {
    aum += pos.currentValue;
    costAum += pos.costTotal;
  }

  for (const month of result.monthly.values()) {
    if (month.vehicleId !== vehicle.id) continue;
    irYear += month.totalDarf6015 + month.irProgressive + month.jcpIrrf + month.rfIrrf + month.irrf15270;
    irrf15270 += month.irrf15270;
  }

  const annual = [...result.annual.values()].find((item) => item.vehicleId === vehicle.id);
  if (annual) {
    irYear += annual.exteriorIrBrl + annual.irpfmDue;
    irpfmDue = annual.irpfmDue;
  }

  let status: ClientSummary["status"] = "ok";
  let statusText = "Em dia";

  if (irpfmDue > 0) {
    status = "alert";
    statusText = `IRPFM ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(irpfmDue)}`;
  } else if (irrf15270 > 0) {
    status = "warn";
    statusText = "Lei 15.270 acionada";
  }

  return {
    id: client.id,
    aum,
    costAum,
    unrealizedGain: aum - costAum,
    irProjected: irYear,
    status,
    statusText,
  };
}

export function summarizeRuntimeClients(): {
  rows: RuntimeClientSummary[];
  totals: { totalAum: number; totalIr: number; totalSaved: number; clientsWithAlert: number };
} {
  const rows = getRuntimeClients().map((client) => ({
    client,
    summary: summarizeRuntimeClient(client),
  }));

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalAum += row.summary.aum;
      acc.totalIr += row.summary.irProjected;
      if (row.summary.status !== "ok") acc.clientsWithAlert += 1;
      return acc;
    },
    { totalAum: 0, totalIr: 0, totalSaved: 0, clientsWithAlert: 0 },
  );

  return { rows, totals };
}

export function getRuntimeFiscalEvents(year = 2026): RuntimeFiscalEvent[] {
  const events: RuntimeFiscalEvent[] = [];

  for (const client of getRuntimeClients()) {
    const vehicle = getPrimaryVehicle(client);
    if (!vehicle) continue;

    const operations = getRuntimeOperations(client, year);
    const result = runEngine(operations);
    const summary = summarizeRuntimeClient(client);

    for (const event of listFiscalEvents(result, vehicle.id, year)) {
      events.push({
        ...event,
        id: `${client.id}-${event.id}`,
        clientId: client.id,
        clientName: client.name,
        vehicleId: vehicle.id,
        status: summary.status,
        statusText: summary.statusText,
      });
    }

    const annual = [...result.annual.values()].find((item) => item.vehicleId === vehicle.id);
    if (!annual) continue;

    const annualDueDate = `${year + 1}-05-31`;
    if (annual.exteriorIrBrl > 0) {
      events.push({
        id: `${client.id}-daa-exterior-${year}`,
        date: annualDueDate,
        kind: "venc",
        description: `DAA - Lei 14.754 exterior (${year})`,
        amount: annual.exteriorIrBrl,
        clientId: client.id,
        clientName: client.name,
        vehicleId: vehicle.id,
        status: summary.status,
        statusText: summary.statusText,
      });
    }

    if (annual.irpfmDue > 0) {
      events.push({
        id: `${client.id}-irpfm-${year}`,
        date: annualDueDate,
        kind: "trigger",
        description: `IRPFM - ajuste anual Lei 15.270 (${year})`,
        amount: annual.irpfmDue,
        clientId: client.id,
        clientName: client.name,
        vehicleId: vehicle.id,
        status: summary.status,
        statusText: summary.statusText,
      });
    }
  }

  return events.sort((a, b) => (a.date < b.date ? -1 : 1));
}
