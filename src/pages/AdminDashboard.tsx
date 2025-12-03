import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import extentrackLogo from "@/assets/extentrack-logo.jpg";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Search, LogOut, Edit, Eye, EyeOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboard = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<any>(null);
  const [deletingCoordinator, setDeletingCoordinator] = useState<any>(null);
  const [newCoordinator, setNewCoordinator] = useState({
    name: "",
    email: "",
    department: "",
    password: ""
  });
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [createdCoordinators, setCreatedCoordinators] = useState<Array<{email: string, password: string, name: string}>>([]);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});
  const { signOut, createCoordinator } = useAuth();

  // Buscar coordenadores do banco de dados
  useEffect(() => {
    fetchCoordinators();
  }, []);

  const fetchCoordinators = async () => {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('role', 'coordinator');
    
    if (error) {
      console.error('Erro ao buscar coordenadores:', error);
      return;
    }

    setCoordinators(data || []);
  };

  const handleAddCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await createCoordinator(
      newCoordinator.email,
      newCoordinator.password,
      newCoordinator.name,
      newCoordinator.department
    );

    if (error) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar coordenador.",
        variant: "destructive",
      });
      return;
    }

    // Salvar dados do coordenador criado para mostrar senha
    const coordinatorData = {
      email: newCoordinator.email,
      password: newCoordinator.password,
      name: newCoordinator.name
    };
    setCreatedCoordinators([...createdCoordinators, coordinatorData]);
    
    // Atualizar lista de coordenadores
    await fetchCoordinators();
    
    setNewCoordinator({ name: "", email: "", department: "", password: "" });
    setShowAddForm(false);
    toast({
      title: "Coordenador cadastrado!",
      description: `${coordinatorData.name} foi cadastrado com sucesso.`,
    });
  };

  const handleEditCoordinator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('perfis')
      .update({
        name: editingCoordinator.name,
        department: editingCoordinator.department
      })
      .eq('id', editingCoordinator.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar coordenador.",
        variant: "destructive",
      });
      console.error('Erro ao editar:', error);
      return;
    }

    await fetchCoordinators();
    setIsEditOpen(false);
    setEditingCoordinator(null);
    toast({
      title: "Coordenador atualizado!",
      description: `${editingCoordinator.name} foi atualizado com sucesso.`,
    });
  };

  const handleDeleteCoordinator = async () => {
    if (!deletingCoordinator) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro",
          description: "Sessão expirada. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-coordinator', {
        body: { userId: deletingCoordinator.user_id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao excluir coordenador');
      }

      await fetchCoordinators();
      setIsDeleteOpen(false);
      setDeletingCoordinator(null);
      toast({
        title: "Coordenador excluído!",
        description: `${deletingCoordinator.name} foi excluído com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir coordenador.",
        variant: "destructive",
      });
      console.error('Erro ao deletar:', error);
    }
  };

  const openDeleteCoordinator = (coordinator: any) => {
    setDeletingCoordinator(coordinator);
    setIsDeleteOpen(true);
  };

  const openEditCoordinator = (coordinator: any) => {
    setEditingCoordinator({ ...coordinator });
    setIsEditOpen(true);
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Sessão encerrada",
      description: "Você foi deslogado com sucesso.",
    });
  };

  const filteredCoordinators = coordinators.filter(coord =>
    coord.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coord.department && coord.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const togglePasswordVisibility = (email: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [email]: !prev[email]
    }));
  };

  const getCoordinatorPassword = (email: string) => {
    const created = createdCoordinators.find(c => c.email === email);
    return created?.password;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img src={extentrackLogo} alt="ExtenTrack Logo" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Painel Administrativo</h1>
                <p className="text-blue-100">Gestão de coordenadores e sistema</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Coordenadores Management */}
        <Card className="gradient-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Gerenciar Coordenadores</CardTitle>
                <CardDescription>
                  Cadastre e gerencie coordenadores de projetos de extensão
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary hover:bg-primary-dark shadow-glow"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Coordenador
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Add Coordinator Form */}
            {showAddForm && (
              <Card className="bg-muted/50">
                <CardContent className="p-6">
                  <form onSubmit={handleAddCoordinator} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={newCoordinator.name}
                          onChange={(e) => setNewCoordinator({...newCoordinator, name: e.target.value})}
                          placeholder="Prof. João Silva"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail Institucional</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newCoordinator.email}
                          onChange={(e) => setNewCoordinator({...newCoordinator, email: e.target.value})}
                          placeholder="joao.silva@uni.br"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">Departamento</Label>
                        <Input
                          id="department"
                          value={newCoordinator.department}
                          onChange={(e) => setNewCoordinator({...newCoordinator, department: e.target.value})}
                          placeholder="Engenharia"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Senha Inicial</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newCoordinator.password}
                          onChange={(e) => setNewCoordinator({...newCoordinator, password: e.target.value})}
                          placeholder="Senha de acesso"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" className="bg-primary hover:bg-primary-dark">
                        Cadastrar
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar coordenadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Coordinators List */}
            <div className="space-y-4">
              {filteredCoordinators.map(coord => {
                const password = getCoordinatorPassword(coord.email);
                return (
                  <Card key={coord.id} className="bg-card hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {coord.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{coord.name}</h3>
                            <p className="text-sm text-muted-foreground">{coord.email}</p>
                            <p className="text-sm text-muted-foreground">{coord.department || 'Sem departamento'}</p>
                            {password && (
                              <div className="flex items-center space-x-2 mt-1">
                                <p className="text-sm text-muted-foreground">
                                  Senha: {showPasswords[coord.email] ? password : '••••••••'}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => togglePasswordVisibility(coord.email)}
                                >
                                  {showPasswords[coord.email] ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditCoordinator(coord)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => openDeleteCoordinator(coord)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Edit Coordinator Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Coordenador</DialogTitle>
              <DialogDescription>
                Atualize as informações do coordenador
              </DialogDescription>
            </DialogHeader>
            {editingCoordinator && (
              <form onSubmit={handleEditCoordinator} className="space-y-4">
                <div>
                  <Label htmlFor="editName">Nome Completo</Label>
                  <Input
                    id="editName"
                    value={editingCoordinator.name}
                    onChange={(e) => setEditingCoordinator({...editingCoordinator, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editEmail">E-mail Institucional</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editingCoordinator.email}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado</p>
                </div>
                <div>
                  <Label htmlFor="editDepartment">Departamento</Label>
                  <Input
                    id="editDepartment"
                    value={editingCoordinator.department}
                    onChange={(e) => setEditingCoordinator({...editingCoordinator, department: e.target.value})}
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="bg-primary hover:bg-primary-dark">
                    Salvar Alterações
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Coordinator Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Coordenador</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este coordenador? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            {deletingCoordinator && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold">{deletingCoordinator.name}</p>
                  <p className="text-sm text-muted-foreground">{deletingCoordinator.email}</p>
                  <p className="text-sm text-muted-foreground">{deletingCoordinator.department}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteCoordinator}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Confirmar Exclusão
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;