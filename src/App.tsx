/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Phone,
  IdCard,
  ListChecks,
  Baby,
  X,
  Copy,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCqyCcs2R2e7AegGjvFAwG98wlamtbHvZY",
  authDomain: "bard-frontend.firebaseapp.com",
  projectId: "bard-frontend",
  storageBucket: "bard-frontend.firebasestorage.app",
  messagingSenderId: "175205271074",
  appId: "1:175205271074:web:2b7bd4d34d33bf38e6ec7b"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

type ZoneType = 'limpieza' | 'baños' | 'madres';

interface ScheduleEntry {
  turno: string;
  horas: string;
  tareas: string;
}

interface Zone {
  id: number;
  name: string;
  type: ZoneType;
}

interface DayStatus {
  status: 'pendiente' | 'progreso' | 'completado';
  notes: string;
}

interface AppData {
  leads: {
    banos: string;
    telBanos: string;
    auditorio: string;
    telAuditorio: string;
    madres: string;
    telMadres: string;
  };
  zones: Zone[];
  dailyStatus: Record<string, Record<number, DayStatus>>;
}

const DETAILED_SCHEDULES: Record<ZoneType, ScheduleEntry[]> = {
  'baños': [
    { turno: 'Mañana 1', horas: '8:00 AM - Int.', tareas: 'Control de higiene inicial' },
    { turno: 'Mañana 2', horas: 'Int. - Final Mañ.', tareas: 'Vaciado papeleras y orden' },
    { turno: 'Tarde 1', horas: 'Inicio - Int.', tareas: 'Reabastecimiento insumos' },
    { turno: 'Tarde 2', horas: 'Int. - Cierre', tareas: 'Desinfección final' }
  ],
  'limpieza': [
    { turno: 'Mañana 1', horas: '8:00 AM - Int.', tareas: 'Revisión sillas y accesos' },
    { turno: 'Mañana 2', horas: 'Int. - Final Mañ.', tareas: 'Recogida literatura/basura' },
    { turno: 'Tarde 1', horas: 'Inicio - Int.', tareas: 'Vaciado de contenedores' },
    { turno: 'Tarde 2', horas: 'Int. - Cierre', tareas: 'Reporte final de limpieza' }
  ],
  'madres': [
    { turno: 'Mañana 1', horas: '8:00 AM - Int.', tareas: 'Recepción y control higiene' },
    { turno: 'Mañana 2', horas: 'Int. - Final Mañ.', tareas: 'Asistencia y orden al salir' },
    { turno: 'Tarde 1', horas: 'Inicio - Int.', tareas: 'Insumos y apoyo en silencio' },
    { turno: 'Tarde 2', horas: 'Int. - 4:00 PM', tareas: 'Reporte final y objetos perdidos' }
  ]
};

const DAYS = ['Viernes 6', 'Sábado 7', 'Domingo 8'];

export default function App() {
  const [dayOffset, setDayOffset] = useState(1);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneType, setNewZoneType] = useState<ZoneType>('limpieza');
  const [isLoading, setIsLoading] = useState(true);

  const [data, setData] = useState<AppData>({
    leads: { banos: '', telBanos: '', auditorio: '', telAuditorio: '', madres: '', telMadres: '' },
    zones: [
      { id: 1, name: 'Baños Caballeros', type: 'baños' },
      { id: 2, name: 'Baños Damas', type: 'baños' },
      { id: 3, name: 'Pasillos y Auditorio', type: 'limpieza' },
      { id: 4, name: 'Sala de Madres', type: 'madres' }
    ],
    dailyStatus: {}
  });

  // Escuchar cambios en tiempo real desde Firebase
  useEffect(() => {
    const dataRef = ref(db, 'cleaning_app_data');
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const zones = val.zones ? (Array.isArray(val.zones) ? val.zones : Object.values(val.zones)) : data.zones;
        setData({
          leads: val.leads || data.leads,
          zones: zones as Zone[],
          dailyStatus: val.dailyStatus || {}
        });
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentDay = DAYS[dayOffset];

  const updateLead = (key: keyof AppData['leads'], value: string) => {
    const leadRef = ref(db, `cleaning_app_data/leads`);
    update(leadRef, { [key]: value });
  };

  const updateStatus = (zoneId: number, field: keyof DayStatus, value: string) => {
    const dayKey = currentDay.replace(/\s/g, '_'); 
    const statusRef = ref(db, `cleaning_app_data/dailyStatus/${dayKey}/${zoneId}`);
    update(statusRef, { [field]: value });
  };

  const addZone = () => {
    if (!newZoneName.trim()) return;
    const newZone: Zone = {
      id: Date.now(),
      name: newZoneName,
      type: newZoneType
    };
    const zonesRef = ref(db, `cleaning_app_data/zones`);
    set(zonesRef, [...data.zones, newZone]);
    setNewZoneName('');
    setIsAddModalOpen(false);
  };

  const deleteZone = (id: number) => {
    if (confirm('¿Eliminar esta zona?')) {
      const zonesRef = ref(db, `cleaning_app_data/zones`);
      const filteredZones = data.zones.filter(z => z.id !== id);
      set(zonesRef, filteredZones);
    }
  };

  const copySummary = () => {
    const dayKey = currentDay.replace(/\s/g, '_');
    const statusMap = data.dailyStatus[dayKey] || {};
    let text = `*📋 INFORME DE LIMPIEZA (${currentDay})*\n\n`;
    data.zones.forEach(z => {
      const s = statusMap[z.id] || { status: 'pendiente', notes: '' };
      const icon = s.status === 'completado' ? '✅' : s.status === 'progreso' ? '⏳' : '❌';
      text += `${icon} *${z.name}*: ${s.status.toUpperCase()}\n${s.notes ? `   _${s.notes}_\n` : ''}`;
    });
    navigator.clipboard.writeText(text);
    alert('Resumen para WhatsApp copiado al portapapeles.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-jw-blue"
        >
          <Cloud size={48} />
        </motion.div>
        <p className="ml-4 font-bold text-gray-600">Sincronizando datos...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-jw-blue p-2 rounded-lg text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-jw-blue uppercase tracking-[0.2em] leading-none mb-1">Asamblea de Circuito</p>
              <h1 className="text-sm md:text-lg font-bold text-gray-900 leading-tight">“Oiga lo que el espíritu les dice a las congregaciones”</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              En línea
            </div>
            <button 
              onClick={() => setIsInfoModalOpen(true)}
              className="text-xs bg-amber-100 text-amber-700 px-3 py-2 rounded-lg font-bold hover:bg-amber-200 transition-colors flex items-center gap-2"
            >
              <Info size={14} /> <span className="hidden sm:inline">GUÍA</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <IdCard size={14} /> Responsables del Departamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">Superintendente Baños</label>
              <input 
                type="text" 
                value={data.leads.banos}
                onChange={(e) => updateLead('banos', e.target.value)}
                placeholder="Nombre" 
                className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold outline-none mb-2 focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                <Phone size={12} className="text-gray-300" />
                <input 
                  type="tel" 
                  value={data.leads.telBanos}
                  onChange={(e) => updateLead('telBanos', e.target.value)}
                  placeholder="Teléfono" 
                  className="w-full text-xs outline-none"
                />
              </div>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">Encargado Auditorio</label>
              <input 
                type="text" 
                value={data.leads.auditorio}
                onChange={(e) => updateLead('auditorio', e.target.value)}
                placeholder="Nombre" 
                className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold outline-none mb-2 focus:ring-2 focus:ring-emerald-200"
              />
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                <Phone size={12} className="text-gray-300" />
                <input 
                  type="tel" 
                  value={data.leads.telAuditorio}
                  onChange={(e) => updateLead('telAuditorio', e.target.value)}
                  placeholder="Teléfono" 
                  className="w-full text-xs outline-none"
                />
              </div>
            </div>
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
              <label className="text-[10px] font-bold text-purple-600 uppercase block mb-1">Encargado Sala Madres</label>
              <input 
                type="text" 
                value={data.leads.madres}
                onChange={(e) => updateLead('madres', e.target.value)}
                placeholder="Nombre" 
                className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold outline-none mb-2 focus:ring-2 focus:ring-purple-200"
              />
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                <Phone size={12} className="text-gray-300" />
                <input 
                  type="tel" 
                  value={data.leads.telMadres}
                  onChange={(e) => updateLead('telMadres', e.target.value)}
                  placeholder="Teléfono" 
                  className="w-full text-xs outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between bg-jw-blue p-4 rounded-2xl shadow-lg text-white">
          <button 
            onClick={() => setDayOffset(prev => Math.max(0, prev - 1))}
            disabled={dayOffset === 0}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest block mb-1">Programación para el</span>
            <h2 className="font-bold text-xl tracking-tight">{currentDay}</h2>
          </div>
          <button 
            onClick={() => setDayOffset(prev => Math.min(DAYS.length - 1, prev + 1))}
            disabled={dayOffset === DAYS.length - 1}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center bg-gray-50/50 gap-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <ListChecks size={18} className="text-jw-blue" /> Registro de Actividades
            </h3>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="text-[10px] bg-gray-800 text-white px-4 py-2 rounded-full font-bold uppercase tracking-wider hover:bg-gray-700 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Añadir Área
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4 text-left">Zona / Sección y Cronograma</th>
                  <th className="px-6 py-4 text-left">Voluntarios Asignados</th>
                  <th className="px-6 py-4 text-center">Estado de Higiene</th>
                  <th className="px-6 py-4 text-center w-16">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.zones.map((zone) => {
                  const dayKey = currentDay.replace(/\s/g, '_');
                  const dayStatus = data.dailyStatus[dayKey]?.[zone.id] || { status: 'pendiente', notes: '' };
                  const schedule = DETAILED_SCHEDULES[zone.type];

                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={zone.id} 
                      className="group hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4 min-w-[300px]">
                        <span className={`inline-block text-[7px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 cat-${zone.type}`}>
                          {zone.type}
                        </span>
                        <div className="font-bold text-gray-800 text-xs">{zone.name}</div>
                        
                        <div className="mt-2 bg-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                          <table className="w-full text-[8px] leading-tight">
                            <thead className="bg-gray-100 text-gray-400 font-bold uppercase">
                              <tr>
                                <th className="px-1 py-0.5 text-left">Turno</th>
                                <th className="px-1 py-0.5 text-left">Horario</th>
                                <th className="px-1 py-0.5 text-left">Tarea</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {schedule.map((s, idx) => (
                                <tr key={idx}>
                                  <td className="px-1 py-0.5 font-bold">{s.turno}</td>
                                  <td className="px-1 py-0.5 whitespace-nowrap">{s.horas}</td>
                                  <td className="px-1 py-0.5 text-gray-500 italic">{s.tareas}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <textarea 
                          value={dayStatus.notes}
                          onChange={(e) => updateStatus(zone.id, 'notes', e.target.value)}
                          placeholder="Voluntarios asignados..." 
                          className="w-full bg-transparent border-b border-gray-100 text-xs py-1 outline-none focus:border-jw-blue resize-none h-24 focus:ring-0"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <select 
                          value={dayStatus.status}
                          onChange={(e) => updateStatus(zone.id, 'status', e.target.value as any)}
                          className={`text-[9px] font-bold uppercase px-2 py-1 rounded-full outline-none status-${dayStatus.status}`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="progreso">En Curso</option>
                          <option value="completado">Limpio</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deleteZone(zone.id)}
                          className="text-gray-200 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={copySummary}
            className="bg-white border-2 border-jw-blue text-jw-blue p-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-50 transition-all shadow-sm"
          >
            <Copy size={20} /> Copiar Informe para WhatsApp
          </button>
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 border border-emerald-100 italic text-sm">
            <Cloud size={20} /> Sincronización en tiempo real activa
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isInfoModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Info size={18} className="text-jw-blue" /> Guía de Procedimientos</h3>
                <button onClick={() => setIsInfoModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              
              <div className="flex border-b border-gray-100 px-6 bg-white overflow-x-auto">
                {['general', 'madres', 'limpieza'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)} 
                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-jw-blue text-jw-blue' : 'border-transparent text-gray-400'}`}
                  >
                    {tab === 'general' ? 'General' : tab === 'madres' ? 'Madres con Bebés' : 'Limpieza (S-330)'}
                  </button>
                ))}
              </div>

              <div className="p-6 overflow-y-auto space-y-6 bg-white flex-1 text-sm leading-relaxed text-gray-700">
                {activeTab === 'general' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h4 className="font-bold text-jw-blue mb-2">Propósito del Departamento</h4>
                    <p className="mb-4">Colaborar con el orden y la santidad del lugar de asamblea, permitiendo que todos los hermanos disfruten del alimento espiritual en un ambiente limpio y digno para Jehová.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h5 className="font-bold text-blue-800 text-xs mb-2 uppercase">Principios de Servicio</h5>
                        <ul className="space-y-2 text-xs">
                          <li>• <strong>Discreción:</strong> Realizar tareas de limpieza preferiblemente durante los cánticos o intervalos.</li>
                          <li>• <strong>Amabilidad:</strong> Responder con una sonrisa y tono suave.</li>
                          <li>• <strong>Seguridad:</strong> Reportar cualquier comportamiento inusual a los acomodadores.</li>
                        </ul>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <h5 className="font-bold text-amber-800 text-xs mb-2 uppercase">Equipo y Seguridad</h5>
                        <ul className="space-y-2 text-xs">
                          <li>• Usar guantes desechables siempre que se manejen residuos.</li>
                          <li>• Colocar señales de "Piso Mojado" inmediatamente.</li>
                          <li>• No obstruir salidas de emergencia.</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'madres' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                        <Baby size={32} />
                      </div>
                      <div>
                        <h4 className="font-bold text-purple-900">Sala de Madres con Bebés</h4>
                        <p className="text-xs italic text-gray-500">"Un lugar acogedor, no de castigo o aislamiento."</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs">Espacio para atender necesidades inmediatas. <strong>No es una guardería</strong>; las hermanas asignadas apoyan pero no cuidan a los bebés.</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-purple-50 p-4 rounded-xl">
                          <h5 className="font-bold text-xs mb-2">Higiene Crítica</h5>
                          <ul className="text-xs space-y-2">
                            <li>• Desinfectar cambiadores tras cada uso.</li>
                            <li>• Retirar contenedores de pañales si hay olor.</li>
                            <li>• Limpiar derrames rápidamente.</li>
                          </ul>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <h5 className="font-bold text-xs mb-2">Atención</h5>
                          <ul className="text-xs space-y-2">
                            <li>• Mantener ambiente de silencio.</li>
                            <li>• Ayudar con el acomodo de coches.</li>
                            <li>• Reportar objetos perdidos.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'limpieza' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h4 className="font-bold text-emerald-900 mb-2">Instrucciones S-330</h4>
                    <div className="space-y-4 text-xs">
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <h5 className="font-bold text-emerald-800 uppercase mb-2">Zonas de Baño</h5>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <li>• Verificar papel y jabón cada 30 min.</li>
                          <li>• Limpiar espejos constantemente.</li>
                          <li>• Mantener pisos secos.</li>
                          <li>• Desinfectar manijas y grifos.</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h5 className="font-bold text-gray-700 uppercase mb-2">Pasillos y Auditorio</h5>
                        <p>Durante el programa, caminar discretamente para recoger envoltorios o literatura olvidada.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-800">Nueva Zona</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>
              <div className="space-y-3">
                <select 
                  value={newZoneType}
                  onChange={(e) => setNewZoneType(e.target.value as ZoneType)}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-jw-blue"
                >
                  <option value="limpieza">Limpieza / Auditorio</option>
                  <option value="baños">Baños</option>
                  <option value="madres">Sala de Madres</option>
                </select>
                <input 
                  type="text" 
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Nombre de la zona..." 
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-jw-blue"
                />
              </div>
              <button 
                onClick={addZone}
                className="w-full bg-jw-blue text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-jw-blue-dark transition-colors"
              >
                Agregar Asignación
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
