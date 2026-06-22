// demo-interceptor.js
// Interceptador global de fetch para a versão de portfólio 100% estática.
// Intercepta todas as requisições para o n8n e simula um backend completo no localStorage.

(function () {
    'use strict';

    // 1. Inicializar banco no localStorage caso não exista
    const DB_KEY = 'demo_db';
    function getDB() {
        let raw = localStorage.getItem(DB_KEY);
        if (!raw) {
            // Se o INITIAL_DEMO_DATA não estiver carregado na página, tenta usar dados vazios estruturados
            const initial = window.INITIAL_DEMO_DATA || { astronomos: [], admins: [], eventos: [] };
            localStorage.setItem(DB_KEY, JSON.stringify(initial));
            return initial;
        }
        try {
            return JSON.parse(raw);
        } catch (_) {
            const initial = window.INITIAL_DEMO_DATA || { astronomos: [], admins: [], eventos: [] };
            localStorage.setItem(DB_KEY, JSON.stringify(initial));
            return initial;
        }
    }

    function saveDB(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    // 2. Auxiliares para ler parâmetros de requisição
    function parseRequestBody(body) {
        if (!body) return {};
        if (typeof body === 'string') {
            try {
                return JSON.parse(body);
            } catch (_) {
                // Tenta parsear como URLSearchParams
                const params = new URLSearchParams(body);
                return Object.fromEntries(params.entries());
            }
        }
        if (body instanceof URLSearchParams) {
            return Object.fromEntries(body.entries());
        }
        if (body instanceof FormData) {
            const data = {};
            for (const [key, val] of body.entries()) {
                data[key] = val;
            }
            return data;
        }
        return body;
    }

    // 3. Interceptar window.fetch
    const originalFetch = window.fetch;

    window.fetch = async function (input, init) {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : (input && input.url));
        if (!url) return originalFetch.apply(this, arguments);

        // Verifica se é chamada para os webhooks do Urania Planetario
        const isWebhook = url.includes('/webhook/agenda-astronomos') || 
                          url.includes('/webhook/novo-astronomo-1') ||
                          url.includes('.easypanel.host/webhook');

        if (isWebhook) {
            const db = getDB();
            const body = init ? parseRequestBody(init.body) : {};
            const action = body.action || new URL(url, window.location.href).searchParams.get('action') || '';
            const method = (init && init.method ? init.method.toUpperCase() : 'GET');

            console.log(`[Mock Server] Intercepted URL: ${url} | Action: ${action} | Method: ${method}`, body);

            let responseData = null;

            // --- TRATAMENTO DOS WEBHOOKS DE ASTRÔNOMOS ---
            if (url.includes('novo-astronomo-1')) {
                switch (action) {
                    case 'login': {
                        const user = String(body.usuario || '').trim().toLowerCase();
                        // Procurar astrônomo
                        const found = db.astronomos.find(a => String(a.usuario || '').trim().toLowerCase() === user);
                        if (found) {
                            responseData = {
                                success: true,
                                status: "success",
                                data: found,
                                allow: true
                            };
                        } else {
                            responseData = {
                                success: false,
                                status: "error",
                                message: "Usuário não cadastrado para demonstração."
                            };
                        }
                        break;
                    }
                    case 'admin': {
                        const user = String(body.usuario || '').trim().toLowerCase();
                        // Procurar admin
                        const found = db.admins.find(a => String(a.usuario || '').trim().toLowerCase() === user || String(a.email || '').trim().toLowerCase() === user);
                        if (found) {
                            responseData = {
                                success: true,
                                status: "success",
                                data: found,
                                allow: true
                            };
                        } else {
                            responseData = {
                                success: false,
                                status: "error",
                                message: "Credenciais de administrador inválidas para demonstração."
                            };
                        }
                        break;
                    }
                    case 'list': {
                        responseData = db.astronomos;
                        break;
                    }
                    case 'add': {
                        const nextId = db.astronomos.length ? Math.max(...db.astronomos.map(a => a.id_astronomo || 0)) + 1 : 1;
                        const newAstro = {
                            id_astronomo: nextId,
                            usuario: body.usuario || `astro_${nextId}`,
                            nome_completo: body.nome_completo || 'Novo Astrônomo',
                            cidade_base: body.cidade_base || 'São Paulo - SP',
                            consumo_km_l: Number(body.consumo_km_l || 10),
                            valor_litro: Number(body.valor_litro || 5.80),
                            diaria_hospedagem: Number(body.diaria_hospedagem || 250),
                            alimentacao_diaria: Number(body.alimentacao_diaria || 60),
                            monitor: Number(body.monitor || 120),
                            percentual_lucro: Number(body.percentual_lucro || 15)
                        };
                        db.astronomos.push(newAstro);
                        saveDB(db);
                        responseData = { success: true, data: newAstro };
                        break;
                    }
                    case 'edit': {
                        const astroId = Number(body.id_astronomo);
                        const idx = db.astronomos.findIndex(a => a.id_astronomo === astroId);
                        if (idx !== -1) {
                            db.astronomos[idx] = {
                                ...db.astronomos[idx],
                                nome_completo: body.nome_completo ?? db.astronomos[idx].nome_completo,
                                cidade_base: body.cidade_base ?? db.astronomos[idx].cidade_base,
                                consumo_km_l: body.consumo_km_l != null ? Number(body.consumo_km_l) : db.astronomos[idx].consumo_km_l,
                                valor_litro: body.valor_litro != null ? Number(body.valor_litro) : db.astronomos[idx].valor_litro,
                                diaria_hospedagem: body.diaria_hospedagem != null ? Number(body.diaria_hospedagem) : db.astronomos[idx].diaria_hospedagem,
                                alimentacao_diaria: body.alimentacao_diaria != null ? Number(body.alimentacao_diaria) : db.astronomos[idx].alimentacao_diaria,
                                monitor: body.monitor != null ? Number(body.monitor) : db.astronomos[idx].monitor,
                                percentual_lucro: body.percentual_lucro != null ? Number(body.percentual_lucro) : db.astronomos[idx].percentual_lucro
                            };
                            saveDB(db);
                            responseData = { success: true };
                        } else {
                            responseData = { success: false, message: 'Astrônomo não encontrado.' };
                        }
                        break;
                    }
                    case 'delete': {
                        const astroId = Number(body.id_astronomo);
                        db.astronomos = db.astronomos.filter(a => a.id_astronomo !== astroId);
                        saveDB(db);
                        responseData = { success: true };
                        break;
                    }
                    case 'get_admin': {
                        responseData = db.admins;
                        break;
                    }
                    case 'add_admin': {
                        const nextId = db.admins.length ? Math.max(...db.admins.map(a => a.id_admin || 0)) + 1 : 1;
                        const newAdmin = {
                            id_admin: nextId,
                            usuario: body.email ? body.email.split('@')[0] : `admin_${nextId}`,
                            email: body.email || `admin_${nextId}@urania.example`,
                            senha: body.senha || 'admin123',
                            role: 'admin'
                        };
                        db.admins.push(newAdmin);
                        saveDB(db);
                        responseData = { success: true, data: newAdmin };
                        break;
                    }
                    case 'edit_admin': {
                        const adminId = Number(body.id_admin || body.id);
                        const idx = db.admins.findIndex(a => a.id_admin === adminId);
                        if (idx !== -1) {
                            db.admins[idx] = {
                                ...db.admins[idx],
                                email: body.email ?? db.admins[idx].email,
                                senha: body.senha ?? db.admins[idx].senha
                            };
                            saveDB(db);
                            responseData = { success: true };
                        } else {
                            responseData = { success: false, message: 'Administrador não encontrado.' };
                        }
                        break;
                    }
                    case 'delete_admin': {
                        const adminId = Number(body.id_admin || body.id);
                        db.admins = db.admins.filter(a => a.id_admin !== adminId);
                        saveDB(db);
                        responseData = { success: true };
                        break;
                    }
                    case 'get_img': {
                        responseData = { success: true, data: [] };
                        break;
                    }
                    default: {
                        responseData = { success: true, message: 'Simulated OK' };
                    }
                }
            }
            // --- TRATAMENTO DOS WEBHOOKS DE AGENDA ---
            else if (url.includes('agenda-astronomos')) {
                const astroId = Number(body.id_astronomo || 1);

                switch (action) {
                    case 'atualizar_agenda': {
                        // Retorna apenas eventos não finalizados do astrônomo logado
                        const filtered = db.eventos.filter(ev => 
                            ev.id_astronomo === astroId && ev.finalizado === false
                        );
                        responseData = filtered;
                        break;
                    }
                    case 'historico': {
                        // Retorna todos os eventos do astrônomo (finalizados e não finalizados)
                        const filtered = db.eventos.filter(ev => 
                            ev.id_astronomo === astroId
                        );
                        responseData = filtered;
                        break;
                    }
                    case 'get_feedback': {
                        // Retorna os eventos que possuem feedbacks/avaliacoes já lançadas
                        const filtered = db.eventos.filter(ev => 
                            ev.id_astronomo === astroId && ev.finalizado === true && ev.avaliacao != null
                        );
                        responseData = filtered;
                        break;
                    }
                    case 'lancar_despesas': {
                        // Localiza o evento por ID
                        const evId = body.id_evento || body.id || body.id_evento_unico || body.evento_id;
                        const idx = db.eventos.findIndex(ev => String(ev.id) === String(evId) || String(ev.id_evento) === String(evId));
                        
                        if (idx !== -1) {
                            const event = db.eventos[idx];
                            
                            // Coleta dados financeiros do astrônomo para calcular o lucro estimado
                            const astro = db.astronomos.find(a => a.id_astronomo === event.id_astronomo) || { percentual_lucro: 15 };
                            const pctLucro = astro.percentual_lucro / 100;
                            const totalFaturamento = Number(event.valor_total || event.total || 0);
                            const lucroLiquido = totalFaturamento * pctLucro;

                            // Trata despesas reais enviadas
                            const combustivel = Number(body.combustivel_real ?? body.combustivel ?? 0);
                            const hospedagem = Number(body.hospedagem_real ?? body.hospedagem ?? 0);
                            const alimentacao = Number(body.alimentacao_real ?? body.alimentacao ?? 0);
                            const monitor = Number(body.monitor_real ?? body.monitor ?? 0);
                            const pedagios = Number(body.pedagios_real ?? body.pedagios ?? 0);
                            const totalGastos = combustivel + hospedagem + alimentacao + monitor + pedagios;

                            // Atualiza os dados de despesas reais do evento
                            db.eventos[idx] = {
                                ...event,
                                finalizado: true,
                                finalizada: true,
                                despesas_reais: {
                                    combustivel,
                                    hospedagem,
                                    alimentacao,
                                    monitor,
                                    pedagios
                                },
                                gastos_reais: totalGastos,
                                valor_liquido_astronomo: lucroLiquido,
                                // Salva avaliação caso enviada
                                avaliacao: body.avaliacao || event.avaliacao || '',
                                nota_npm: body.nota_npm != null ? Number(body.nota_npm) : event.nota_npm,
                                npm: body.npm || event.npm || ''
                            };
                            
                            saveDB(db);
                            responseData = { success: true, message: "Despesas reais e status finalizado salvos no localStorage!" };
                        } else {
                            responseData = { success: false, message: "Evento não encontrado no localStorage." };
                        }
                        break;
                    }
                    case 'delete_evento': {
                        const evId = body.id_evento || body.id;
                        db.eventos = db.eventos.filter(ev => String(ev.id) !== String(evId) && String(ev.id_evento) !== String(evId));
                        saveDB(db);
                        responseData = { success: true };
                        break;
                    }
                    default: {
                        responseData = [];
                    }
                }
            } else if (action === 'feedback_app') {
                responseData = { success: true, message: "Sugestão salva localmente!" };
            } else {
                responseData = { success: true };
            }

            // Retorna um Response mocado
            return new Response(JSON.stringify(responseData), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return originalFetch.apply(this, arguments);
    };

    // Inicializar o banco na carga do script
    getDB();

})();
